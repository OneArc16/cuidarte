import { Injectable } from "@nestjs/common";
import { and, asc, eq, gt, inArray } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  adultosMayores,
  adultoMayorImportBatches,
  adultoMayorImportRows,
  auditLogs,
  departments,
  epsCatalog,
  municipalities,
  tenants,
} from "../../../database/schema";
import {
  type AdultoMayorImportBatchCreateCommand,
  type AdultoMayorImportCommitResult,
  type AdultoMayorImportBatchDetailRowRecord,
  type AdultoMayorImportBatchRecord,
  type AdultoMayorImportBatchRowCreateCommand,
  type AdultoMayorImportCatalogMaps,
  type AdultoMayorImportExistingAdultRecord,
  type AdultoMayorImportNormalizedRow,
  type AdultoMayorImportValidatedRow,
} from "../domain/adulto-mayor-import.types";
import { AdultoMayorImportConcurrencyError } from "../domain/adulto-mayor-import.errors";
import { buildAdultoMayorImportChanges } from "../domain/adulto-mayor-import-update";
import { type AdultosMayoresImportRepository } from "../domain/adultos-mayores-import.repository";

type DatabaseLike = DatabaseService["db"];

type ImportBatchRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  requestedByUserId: string;
  originalFilename: string;
  fileChecksumSha256: string;
  templateVersion: number;
  status: AdultoMayorImportBatchRecord["status"];
  totalRows: number;
  readyRows: number;
  invalidRows: number;
  warningRows: number;
  existingRows: number;
  updateRows: number;
  updatedRows: number;
  unchangedRows: number;
  createdRows: number;
  expiresAt: Date;
  confirmedAt: Date | null;
  failureCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DrizzleAdultosMayoresImportRepository implements AdultosMayoresImportRepository {
  constructor(private readonly database: DatabaseService) {}

  async loadCatalogMaps(): Promise<AdultoMayorImportCatalogMaps> {
    const [departmentRows, municipalityRows, epsRows] = await Promise.all([
      this.database.db
        .select({
          id: departments.id,
          code: departments.code,
          name: departments.name,
        })
        .from(departments)
        .where(eq(departments.isActive, true)),
      this.database.db
        .select({
          id: municipalities.id,
          code: municipalities.code,
          departmentId: municipalities.departmentId,
          name: municipalities.name,
        })
        .from(municipalities)
        .where(eq(municipalities.isActive, true)),
      this.database.db
        .select({
          id: epsCatalog.id,
          code: epsCatalog.code,
          name: epsCatalog.name,
          isActive: epsCatalog.isActive,
        })
        .from(epsCatalog),
    ]);

    return {
      departmentsByCode: new Map(
        departmentRows.map((row) => [row.code, { id: row.id, name: row.name }]),
      ),
      municipalitiesByCode: new Map(
        municipalityRows.map((row) => [
          row.code,
          { id: row.id, departmentId: row.departmentId, name: row.name },
        ]),
      ),
      epsByCode: new Map(
        epsRows.map((row) => [row.code, { id: row.id, name: row.name, isActive: row.isActive }]),
      ),
    };
  }

  async findTenantById(
    tenantId: string,
  ): Promise<{ id: string; name: string; isActive: boolean } | null> {
    const [tenant] = await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
        isActive: tenants.isActive,
      })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);

    return tenant ?? null;
  }

  async findActiveTenantOptions(): Promise<Array<{ id: string; name: string }>> {
    return await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .orderBy(asc(tenants.name));
  }

  async findExistingAdultsByTenantAndDocuments(params: {
    tenantId: string;
    documents: Array<{ documentType: string; documentNumber: string }>;
  }): Promise<AdultoMayorImportExistingAdultRecord[]> {
    if (params.documents.length === 0) {
      return [];
    }

    const documentNumbers = [
      ...new Set(params.documents.map((document) => document.documentNumber)),
    ];
    const rows = await this.database.db
      .select()
      .from(adultosMayores)
      .where(
        and(
          eq(adultosMayores.tenantId, params.tenantId),
          inArray(adultosMayores.documentNumber, documentNumbers),
        ),
      );

    return rows.map((row) => this.toExistingAdultRecord(row));
  }

  async createValidatedBatch(params: {
    batch: AdultoMayorImportBatchCreateCommand;
    rows: AdultoMayorImportBatchRowCreateCommand[];
  }): Promise<AdultoMayorImportBatchRecord> {
    return await this.database.db.transaction(async (tx) => {
      const [createdBatch] = await tx
        .insert(adultoMayorImportBatches)
        .values({
          tenantId: params.batch.tenantId,
          requestedByUserId: params.batch.requestedByUserId,
          originalFilename: params.batch.originalFilename,
          fileChecksumSha256: params.batch.fileChecksumSha256,
          templateVersion: params.batch.templateVersion,
          status: params.batch.status,
          totalRows: params.batch.summary.totalRows,
          readyRows: params.batch.summary.readyRows,
          invalidRows: params.batch.summary.invalidRows,
          warningRows: params.batch.summary.warningRows,
          existingRows: params.batch.summary.existingRows,
          updateRows: params.batch.summary.updateRows,
          updatedRows: params.batch.summary.updatedRows,
          unchangedRows: params.batch.summary.unchangedRows,
          createdRows: params.batch.summary.createdRows,
          expiresAt: params.batch.expiresAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: adultoMayorImportBatches.id });

      if (createdBatch === undefined) {
        throw new Error("No fue posible crear el lote de importacion.");
      }

      if (params.rows.length > 0) {
        await tx.insert(adultoMayorImportRows).values(
          params.rows.map((row) => ({
            importBatchId: createdBatch.id,
            rowNumber: row.rowNumber,
            status: row.status,
            normalizedPayload: row.normalizedPayload,
            issues: row.issues,
            existingAdultoId: row.existingAdultoId,
            existingAdultoUpdatedAt: row.existingAdultoUpdatedAt,
          })),
        );
      }

      const batch = await this.findImportBatchById({ importId: createdBatch.id }, tx);

      if (batch === null) {
        throw new Error("No fue posible recuperar el lote de importacion creado.");
      }

      return batch;
    });
  }

  async findImportBatchById(
    params: {
      importId: string;
      tenantId?: string;
      requestedByUserId?: string;
    },
    db: DatabaseLike = this.database.db,
  ): Promise<AdultoMayorImportBatchRecord | null> {
    const [batchRow] = await db
      .select({
        id: adultoMayorImportBatches.id,
        tenantId: adultoMayorImportBatches.tenantId,
        tenantName: tenants.name,
        requestedByUserId: adultoMayorImportBatches.requestedByUserId,
        originalFilename: adultoMayorImportBatches.originalFilename,
        fileChecksumSha256: adultoMayorImportBatches.fileChecksumSha256,
        templateVersion: adultoMayorImportBatches.templateVersion,
        status: adultoMayorImportBatches.status,
        totalRows: adultoMayorImportBatches.totalRows,
        readyRows: adultoMayorImportBatches.readyRows,
        invalidRows: adultoMayorImportBatches.invalidRows,
        warningRows: adultoMayorImportBatches.warningRows,
        existingRows: adultoMayorImportBatches.existingRows,
        updateRows: adultoMayorImportBatches.updateRows,
        updatedRows: adultoMayorImportBatches.updatedRows,
        unchangedRows: adultoMayorImportBatches.unchangedRows,
        createdRows: adultoMayorImportBatches.createdRows,
        expiresAt: adultoMayorImportBatches.expiresAt,
        confirmedAt: adultoMayorImportBatches.confirmedAt,
        failureCode: adultoMayorImportBatches.failureCode,
        createdAt: adultoMayorImportBatches.createdAt,
        updatedAt: adultoMayorImportBatches.updatedAt,
      })
      .from(adultoMayorImportBatches)
      .innerJoin(tenants, eq(tenants.id, adultoMayorImportBatches.tenantId))
      .where(this.buildBatchWhere(params))
      .limit(1);

    if (batchRow === undefined) {
      return null;
    }

    const rows = await this.findImportBatchRows(batchRow.id, db);

    return this.toBatchRecord(batchRow, rows);
  }

  async findImportBatchRows(
    importId: string,
    db: DatabaseLike = this.database.db,
  ): Promise<AdultoMayorImportBatchDetailRowRecord[]> {
    const rows = await db
      .select({
        id: adultoMayorImportRows.id,
        rowNumber: adultoMayorImportRows.rowNumber,
        status: adultoMayorImportRows.status,
        normalizedPayload: adultoMayorImportRows.normalizedPayload,
        issues: adultoMayorImportRows.issues,
        existingAdultoId: adultoMayorImportRows.existingAdultoId,
        existingAdultoUpdatedAt: adultoMayorImportRows.existingAdultoUpdatedAt,
        createdAdultoId: adultoMayorImportRows.createdAdultoId,
        createdAt: adultoMayorImportRows.createdAt,
      })
      .from(adultoMayorImportRows)
      .where(eq(adultoMayorImportRows.importBatchId, importId))
      .orderBy(asc(adultoMayorImportRows.rowNumber));

    return rows.map((row) => ({
      id: row.id,
      rowNumber: row.rowNumber,
      status: row.status,
      normalizedPayload: (row.normalizedPayload as AdultoMayorImportNormalizedRow | null) ?? null,
      issues: (row.issues as AdultoMayorImportValidatedRow["issues"]) ?? [],
      existingAdultoId: row.existingAdultoId,
      existingAdultoUpdatedAt: row.existingAdultoUpdatedAt,
      createdAdultoId: row.createdAdultoId,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async commitValidatedBatch(params: {
    importId: string;
    actorUserId: string;
  }): Promise<AdultoMayorImportCommitResult | null> {
    return await this.database.db.transaction(async (tx) => {
      const completedAt = new Date();
      const [locked] = await tx
        .update(adultoMayorImportBatches)
        .set({
          status: "committing",
          updatedAt: completedAt,
        })
        .where(
          and(
            eq(adultoMayorImportBatches.id, params.importId),
            eq(adultoMayorImportBatches.requestedByUserId, params.actorUserId),
            eq(adultoMayorImportBatches.status, "ready"),
            gt(adultoMayorImportBatches.expiresAt, completedAt),
          ),
        )
        .returning({ id: adultoMayorImportBatches.id });

      if (locked === undefined) {
        return null;
      }

      const batch = await this.findImportBatchById({ importId: params.importId }, tx);

      if (batch === null) {
        throw new Error("No fue posible recuperar el lote bloqueado para confirmar.");
      }

      const rows = await this.findImportBatchRows(params.importId, tx);
      const createRows = rows.filter((row) => row.status === "ready");
      const updateRows = rows.filter((row) => row.status === "update_ready");
      const unchangedRows = rows.filter(
        (row) => row.status === "unchanged" || row.status === "existing",
      );
      const existingRows = [...updateRows, ...unchangedRows];
      const existingIds = existingRows.flatMap((row) =>
        row.existingAdultoId === null ? [] : [row.existingAdultoId],
      );
      const currentExistingRows =
        existingIds.length === 0
          ? []
          : await tx
              .select()
              .from(adultosMayores)
              .where(
                and(
                  eq(adultosMayores.tenantId, batch.tenant.id),
                  inArray(adultosMayores.id, existingIds),
                ),
              )
              .for("update");
      const currentExistingById = new Map(
        currentExistingRows.map((row) => [row.id, this.toExistingAdultRecord(row)]),
      );

      for (const row of existingRows) {
        const current =
          row.existingAdultoId === null ? undefined : currentExistingById.get(row.existingAdultoId);

        if (
          current === undefined ||
          (row.existingAdultoUpdatedAt !== null &&
            current.updatedAt.getTime() !== row.existingAdultoUpdatedAt.getTime())
        ) {
          throw new AdultoMayorImportConcurrencyError();
        }
      }

      const insertedAdults =
        createRows.length === 0
          ? []
          : await tx
              .insert(adultosMayores)
              .values(
                createRows.map((row) => {
                  const payload = this.requireNormalizedPayload(row);

                  return {
                    tenantId: batch.tenant.id,
                    ...this.buildAdultoMayorValues(payload),
                    createdAt: completedAt,
                    updatedAt: completedAt,
                  };
                }),
              )
              .onConflictDoNothing()
              .returning({
                id: adultosMayores.id,
                documentType: adultosMayores.documentType,
                documentNumber: adultosMayores.documentNumber,
              });

      if (insertedAdults.length !== createRows.length) {
        throw new AdultoMayorImportConcurrencyError();
      }

      const insertedByKey = new Map(
        insertedAdults.map((adulto) => [
          this.buildDocumentKey(adulto.documentType, adulto.documentNumber),
          adulto,
        ]),
      );

      for (const row of createRows) {
        const payload = this.requireNormalizedPayload(row);
        const inserted = insertedByKey.get(
          this.buildDocumentKey(payload.documentType, payload.documentNumber),
        );

        if (inserted === undefined) {
          throw new AdultoMayorImportConcurrencyError();
        }

        await tx
          .update(adultoMayorImportRows)
          .set({ createdAdultoId: inserted.id })
          .where(eq(adultoMayorImportRows.id, row.id));
      }

      const updateAudits: Array<typeof auditLogs.$inferInsert> = [];

      for (const row of updateRows) {
        const payload = this.requireNormalizedPayload(row);
        const existingAdultoId = row.existingAdultoId;
        const existingUpdatedAt = row.existingAdultoUpdatedAt;

        if (existingAdultoId === null || existingUpdatedAt === null) {
          throw new AdultoMayorImportConcurrencyError();
        }

        const current = currentExistingById.get(existingAdultoId);

        if (current === undefined) {
          throw new AdultoMayorImportConcurrencyError();
        }

        const [updated] = await tx
          .update(adultosMayores)
          .set({
            ...this.buildAdultoMayorValues(payload),
            updatedAt: completedAt,
          })
          .where(
            and(
              eq(adultosMayores.id, existingAdultoId),
              eq(adultosMayores.tenantId, batch.tenant.id),
            ),
          )
          .returning({ id: adultosMayores.id });

        if (updated === undefined) {
          throw new AdultoMayorImportConcurrencyError();
        }

        updateAudits.push({
          actorUserId: params.actorUserId,
          action: "adultos-mayores.import.updated",
          targetTenantId: batch.tenant.id,
          summary: `Adulto mayor actualizado por importacion: ${payload.firstName} ${payload.firstSurname}`,
          metadata: {
            importId: params.importId,
            rowNumber: row.rowNumber,
            adultoMayorId: existingAdultoId,
            changes: buildAdultoMayorImportChanges(current, payload),
          },
          createdAt: completedAt,
        });
      }

      if (updateAudits.length > 0) {
        await tx.insert(auditLogs).values(updateAudits);
      }

      const result: AdultoMayorImportCommitResult = {
        createdRows: insertedAdults.length,
        updatedRows: updateRows.length,
        unchangedRows: unchangedRows.length,
        existingRows: existingRows.length,
        completedAt,
      };

      await tx
        .update(adultoMayorImportBatches)
        .set({
          status: "completed",
          createdRows: result.createdRows,
          updatedRows: result.updatedRows,
          unchangedRows: result.unchangedRows,
          existingRows: result.existingRows,
          confirmedAt: completedAt,
          failureCode: null,
          updatedAt: completedAt,
        })
        .where(eq(adultoMayorImportBatches.id, params.importId));

      await tx.insert(auditLogs).values({
        actorUserId: params.actorUserId,
        action: "adultos-mayores.import.completed",
        targetTenantId: batch.tenant.id,
        summary: `Importacion completada para ${batch.tenant.name}`,
        metadata: {
          importId: params.importId,
          checksum: batch.fileChecksumSha256,
          templateVersion: batch.templateVersion,
          totalRows: batch.summary.totalRows,
          createdRows: result.createdRows,
          updatedRows: result.updatedRows,
          unchangedRows: result.unchangedRows,
          existingRows: result.existingRows,
        },
        createdAt: completedAt,
      });

      return result;
    });
  }

  async recordAudit(params: {
    actorUserId: string;
    action: string;
    targetTenantId: string;
    summary: string;
    metadata: Record<string, unknown>;
  }): Promise<void> {
    await this.database.db.insert(auditLogs).values({
      actorUserId: params.actorUserId,
      action: params.action,
      targetTenantId: params.targetTenantId,
      summary: params.summary,
      metadata: params.metadata,
    });
  }

  private buildBatchWhere(params: {
    importId: string;
    tenantId?: string;
    requestedByUserId?: string;
  }) {
    const conditions = [eq(adultoMayorImportBatches.id, params.importId)];

    if (params.tenantId !== undefined) {
      conditions.push(eq(adultoMayorImportBatches.tenantId, params.tenantId));
    }

    if (params.requestedByUserId !== undefined) {
      conditions.push(eq(adultoMayorImportBatches.requestedByUserId, params.requestedByUserId));
    }

    return and(...conditions);
  }

  private toBatchRecord(
    batchRow: ImportBatchRow,
    rows: AdultoMayorImportBatchDetailRowRecord[],
  ): AdultoMayorImportBatchRecord {
    const issues = rows.flatMap((row) => row.issues);

    return {
      id: batchRow.id,
      tenant: {
        id: batchRow.tenantId,
        name: batchRow.tenantName,
      },
      requestedByUserId: batchRow.requestedByUserId,
      originalFilename: batchRow.originalFilename,
      fileChecksumSha256: batchRow.fileChecksumSha256,
      templateVersion: batchRow.templateVersion,
      status: batchRow.status,
      summary: {
        totalRows: batchRow.totalRows,
        readyRows: batchRow.readyRows,
        invalidRows: batchRow.invalidRows,
        warningRows: batchRow.warningRows,
        existingRows: batchRow.existingRows,
        updateRows: batchRow.updateRows,
        updatedRows: batchRow.updatedRows,
        unchangedRows: batchRow.unchangedRows,
        createdRows: batchRow.createdRows,
      },
      issues,
      rows,
      canConfirm: batchRow.status === "ready" && batchRow.confirmedAt === null,
      expiresAt: batchRow.expiresAt,
      confirmedAt: batchRow.confirmedAt,
      failureCode: batchRow.failureCode,
      createdAt: batchRow.createdAt,
      updatedAt: batchRow.updatedAt,
    };
  }

  private toExistingAdultRecord(
    row: typeof adultosMayores.$inferSelect,
  ): AdultoMayorImportExistingAdultRecord {
    return {
      id: row.id,
      documentType: row.documentType,
      documentNumber: row.documentNumber,
      firstName: row.firstName,
      middleName: row.middleName,
      firstSurname: row.firstSurname,
      secondSurname: row.secondSurname,
      birthDate: row.birthDate,
      sex: row.sex,
      educationLevel: row.educationLevel,
      disability: row.disability,
      populationGroup: row.populationGroup,
      address: row.address,
      departmentId: row.departmentId,
      municipalityId: row.municipalityId,
      department: row.department,
      municipality: row.municipality,
      zone: row.zone as AdultoMayorImportNormalizedRow["zone"],
      country: row.country,
      phone: row.phone,
      phoneSecondary: row.phoneSecondary,
      email: row.email,
      emergencyContactFullName: row.emergencyContactFullName,
      emergencyContactRelationship: row.emergencyContactRelationship,
      emergencyContactPhone: row.emergencyContactPhone,
      emergencyContactAddress: row.emergencyContactAddress,
      bloodType: row.bloodType as AdultoMayorImportNormalizedRow["bloodType"],
      sisben: row.sisben,
      healthRegime: row.healthRegime,
      epsId: row.epsId,
      eps: row.eps,
      livesWithSomeone: row.livesWithSomeone,
      companion: row.companion,
      economicIncome: row.economicIncome,
      socialProgramBeneficiary: row.socialProgramBeneficiary,
      updatedAt: row.updatedAt,
    };
  }

  private requireNormalizedPayload(
    row: AdultoMayorImportBatchDetailRowRecord,
  ): AdultoMayorImportNormalizedRow {
    if (row.normalizedPayload === null) {
      throw new Error(`La fila ${row.rowNumber} no tiene datos normalizados.`);
    }

    return row.normalizedPayload;
  }

  private buildAdultoMayorValues(payload: AdultoMayorImportNormalizedRow) {
    return {
      documentType: payload.documentType,
      documentNumber: payload.documentNumber,
      names: [payload.firstName, payload.middleName].filter(Boolean).join(" "),
      surnames: [payload.firstSurname, payload.secondSurname].filter(Boolean).join(" "),
      firstName: payload.firstName,
      middleName: payload.middleName,
      firstSurname: payload.firstSurname,
      secondSurname: payload.secondSurname,
      birthDate: payload.birthDate,
      sex: payload.sex,
      educationLevel: payload.educationLevel,
      disability: payload.disability,
      populationGroup: payload.populationGroup,
      address: payload.address,
      departmentId: payload.departmentId,
      municipalityId: payload.municipalityId,
      department: payload.department,
      municipality: payload.municipality,
      zone: payload.zone,
      country: payload.country,
      phone: payload.phone,
      phoneSecondary: payload.phoneSecondary,
      email: payload.email,
      emergencyContactFullName: payload.emergencyContactFullName,
      emergencyContactRelationship: payload.emergencyContactRelationship,
      emergencyContactPhone: payload.emergencyContactPhone,
      emergencyContactAddress: payload.emergencyContactAddress,
      bloodType: payload.bloodType,
      sisben: payload.sisben,
      healthRegime: payload.healthRegime,
      epsId: payload.epsId,
      eps: payload.eps,
      livesWithSomeone: payload.livesWithSomeone,
      companion: payload.companion,
      economicIncome: payload.economicIncome,
      socialProgramBeneficiary: payload.socialProgramBeneficiary,
    };
  }

  private buildDocumentKey(documentType: string, documentNumber: string): string {
    return `${documentType}::${documentNumber}`;
  }
}
