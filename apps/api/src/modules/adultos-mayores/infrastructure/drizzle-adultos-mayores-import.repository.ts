import { Injectable } from "@nestjs/common";
import { and, asc, eq, inArray, sql } from "drizzle-orm";

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
  type AdultoMayorImportExistingRecord,
  type AdultoMayorImportNormalizedRow,
  type AdultoMayorImportValidatedRow,
} from "../domain/adulto-mayor-import.types";
import {
  AdultoMayorImportCommitConflictError,
  type AdultosMayoresImportRepository,
} from "../domain/adultos-mayores-import.repository";

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
  updateRows: number;
  invalidRows: number;
  warningRows: number;
  unchangedRows: number;
  existingRows: number;
  createdRows: number;
  updatedRows: number;
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
  }): Promise<AdultoMayorImportExistingRecord[]> {
    if (params.documents.length === 0) {
      return [];
    }

    const documentNumbers = [
      ...new Set(params.documents.map((document) => document.documentNumber)),
    ];
    const rows = await this.database.db
      .select({
        id: adultosMayores.id,
        documentType: adultosMayores.documentType,
        documentNumber: adultosMayores.documentNumber,
        firstName: adultosMayores.firstName,
        middleName: adultosMayores.middleName,
        firstSurname: adultosMayores.firstSurname,
        secondSurname: adultosMayores.secondSurname,
        birthDate: adultosMayores.birthDate,
        sex: adultosMayores.sex,
        status: adultosMayores.status,
        educationLevel: adultosMayores.educationLevel,
        disability: adultosMayores.disability,
        populationGroup: adultosMayores.populationGroup,
        address: adultosMayores.address,
        departmentId: adultosMayores.departmentId,
        municipalityId: adultosMayores.municipalityId,
        department: adultosMayores.department,
        municipality: adultosMayores.municipality,
        zone: adultosMayores.zone,
        country: adultosMayores.country,
        phone: adultosMayores.phone,
        phoneSecondary: adultosMayores.phoneSecondary,
        email: adultosMayores.email,
        emergencyContactFullName: adultosMayores.emergencyContactFullName,
        emergencyContactRelationship: adultosMayores.emergencyContactRelationship,
        emergencyContactPhone: adultosMayores.emergencyContactPhone,
        emergencyContactAddress: adultosMayores.emergencyContactAddress,
        bloodType: adultosMayores.bloodType,
        sisben: adultosMayores.sisben,
        healthRegime: adultosMayores.healthRegime,
        epsId: adultosMayores.epsId,
        legacyEps: adultosMayores.eps,
        epsName: epsCatalog.name,
        livesWithSomeone: adultosMayores.livesWithSomeone,
        companion: adultosMayores.companion,
        economicIncome: adultosMayores.economicIncome,
        socialProgramBeneficiary: adultosMayores.socialProgramBeneficiary,
        updatedAt: adultosMayores.updatedAt,
      })
      .from(adultosMayores)
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(
        and(
          eq(adultosMayores.tenantId, params.tenantId),
          inArray(adultosMayores.documentNumber, documentNumbers),
        ),
      );

    return rows.map(
      (row): AdultoMayorImportExistingRecord => ({
        id: row.id,
        documentType: row.documentType,
        documentNumber: row.documentNumber,
        firstName: row.firstName,
        middleName: row.middleName,
        firstSurname: row.firstSurname,
        secondSurname: row.secondSurname,
        birthDate: row.birthDate,
        sex: row.sex,
        status: row.status,
        educationLevel: row.educationLevel,
        disability: row.disability,
        populationGroup: row.populationGroup,
        address: row.address,
        departmentId: row.departmentId ?? "",
        municipalityId: row.municipalityId ?? "",
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
        eps: row.legacyEps ?? row.epsName ?? null,
        livesWithSomeone: row.livesWithSomeone,
        companion: row.companion,
        economicIncome: row.economicIncome,
        socialProgramBeneficiary: row.socialProgramBeneficiary,
        updatedAt: row.updatedAt.toISOString(),
      }),
    );
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
          updateRows: params.batch.summary.updateRows,
          invalidRows: params.batch.summary.invalidRows,
          warningRows: params.batch.summary.warningRows,
          unchangedRows: params.batch.summary.unchangedRows,
          existingRows: params.batch.summary.existingRows,
          createdRows: params.batch.summary.createdRows,
          updatedRows: params.batch.summary.updatedRows,
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
            existingAdultoUpdatedAt:
              row.existingAdultoUpdatedAt === null ? null : new Date(row.existingAdultoUpdatedAt),
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
        updateRows: adultoMayorImportBatches.updateRows,
        invalidRows: adultoMayorImportBatches.invalidRows,
        warningRows: adultoMayorImportBatches.warningRows,
        unchangedRows: adultoMayorImportBatches.unchangedRows,
        existingRows: adultoMayorImportBatches.existingRows,
        createdRows: adultoMayorImportBatches.createdRows,
        updatedRows: adultoMayorImportBatches.updatedRows,
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
      existingAdultoUpdatedAt: row.existingAdultoUpdatedAt?.toISOString() ?? null,
      createdAdultoId: row.createdAdultoId,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  async lockBatchForConfirmation(params: {
    importId: string;
    requestedByUserId: string;
  }): Promise<AdultoMayorImportBatchRecord | null> {
    return await this.database.db.transaction(async (tx) => {
      const [updated] = await tx
        .update(adultoMayorImportBatches)
        .set({
          status: "committing",
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(adultoMayorImportBatches.id, params.importId),
            eq(adultoMayorImportBatches.requestedByUserId, params.requestedByUserId),
            eq(adultoMayorImportBatches.status, "ready"),
          ),
        )
        .returning({ id: adultoMayorImportBatches.id });

      if (updated === undefined) {
        return null;
      }

      const batch = await this.findImportBatchById({ importId: params.importId }, tx);
      return batch;
    });
  }

  async markImportAsCompleted(params: {
    importId: string;
    createdRows: number;
    updatedRows: number;
    unchangedRows: number;
    existingRows: number;
    confirmedAt: Date;
  }): Promise<void> {
    await this.database.db
      .update(adultoMayorImportBatches)
      .set({
        status: "completed",
        createdRows: params.createdRows,
        updatedRows: params.updatedRows,
        unchangedRows: params.unchangedRows,
        existingRows: params.existingRows,
        confirmedAt: params.confirmedAt,
        updatedAt: params.confirmedAt,
      })
      .where(eq(adultoMayorImportBatches.id, params.importId));
  }

  async markImportAsFailed(params: { importId: string; failureCode: string }): Promise<void> {
    await this.database.db
      .update(adultoMayorImportBatches)
      .set({
        status: "failed",
        failureCode: params.failureCode,
        updatedAt: new Date(),
      })
      .where(eq(adultoMayorImportBatches.id, params.importId));
  }

  async commitValidatedBatch(params: {
    importId: string;
    actorUserId: string;
  }): Promise<AdultoMayorImportCommitResult> {
    return await this.database.db.transaction(async (tx) => {
      const batch = await this.findImportBatchById({ importId: params.importId }, tx);

      if (batch === null) {
        throw new Error("No fue posible recuperar el lote de importacion.");
      }

      const rows = await this.findImportBatchRows(params.importId, tx);
      const readyRows = rows.filter(
        (row) => row.status === "ready" && row.normalizedPayload !== null,
      );
      const updateRows = rows.filter(
        (row) =>
          row.status === "update_ready" &&
          row.normalizedPayload !== null &&
          row.existingAdultoId !== null,
      );
      const unchangedRows = rows.filter(
        (row) => row.status === "unchanged" && row.existingAdultoId !== null,
      );

      await this.assertCreateRowsStillAvailable(tx, batch.tenant.id, readyRows);

      const confirmedAt = new Date();
      const insertedAdults = await this.insertAdultosMayoresWithDb(tx, {
        tenantId: batch.tenant.id,
        requestedByUserId: params.actorUserId,
        rows: readyRows.map((row) => ({
          documentType: row.normalizedPayload?.documentType ?? "",
          documentNumber: row.normalizedPayload?.documentNumber ?? "",
          normalizedPayload: row.normalizedPayload ?? {},
        })),
      });

      if (insertedAdults.length !== readyRows.length) {
        throw new AdultoMayorImportCommitConflictError();
      }

      const createdAdultsByKey = new Map(
        insertedAdults.map((adulto) => [
          this.buildDocumentKey(adulto.documentType, adulto.documentNumber),
          adulto.id,
        ]),
      );

      for (const row of readyRows) {
        const documentKey = this.buildDocumentKey(
          row.normalizedPayload?.documentType ?? "",
          row.normalizedPayload?.documentNumber ?? "",
        );
        const createdAdultoId = createdAdultsByKey.get(documentKey);

        if (createdAdultoId === undefined) {
          throw new AdultoMayorImportCommitConflictError();
        }

        await tx
          .update(adultoMayorImportRows)
          .set({ createdAdultoId })
          .where(eq(adultoMayorImportRows.id, row.id));
      }

      for (const row of updateRows) {
        const [updatedAdult] = await tx
          .update(adultosMayores)
          .set({
            ...this.buildAdultoMutableValues(row.normalizedPayload ?? {}),
            updatedAt: confirmedAt,
          })
          .where(eq(adultosMayores.id, row.existingAdultoId ?? ""))
          .returning({ id: adultosMayores.id });

        if (updatedAdult === undefined) {
          throw new AdultoMayorImportCommitConflictError();
        }
      }

      if (updateRows.length > 0) {
        await tx.insert(auditLogs).values(
          updateRows.map((row) => ({
            actorUserId: params.actorUserId,
            action: "adultos-mayores.updated" as const,
            targetTenantId: batch.tenant.id,
            summary: `Adulto mayor actualizado por importacion: ${this.buildAdultoSummary(
              row.normalizedPayload ?? {},
            )}`,
            metadata: {
              importId: batch.id,
              source: "adultos-mayores.import",
              adultoMayorId: row.existingAdultoId,
              rowNumber: row.rowNumber,
            },
          })),
        );
      }

      const createdRows = insertedAdults.length;
      const updatedRows = updateRows.length;
      const unchangedRowsCount = unchangedRows.length;
      const existingRows = updatedRows + unchangedRowsCount;

      await tx
        .update(adultoMayorImportBatches)
        .set({
          status: "completed",
          createdRows,
          updatedRows,
          unchangedRows: unchangedRowsCount,
          existingRows,
          confirmedAt,
          updatedAt: confirmedAt,
        })
        .where(eq(adultoMayorImportBatches.id, params.importId));

      await tx.insert(auditLogs).values({
        actorUserId: params.actorUserId,
        action: "adultos-mayores.import.completed",
        targetTenantId: batch.tenant.id,
        summary: `Importacion completada para ${batch.tenant.name}`,
        metadata: {
          importId: batch.id,
          checksum: batch.fileChecksumSha256,
          templateVersion: batch.templateVersion,
          totalRows: batch.summary.totalRows,
          createdRows,
          updatedRows,
          unchangedRows: unchangedRowsCount,
          existingRows,
          invalidRows: batch.summary.invalidRows,
        },
      });

      return {
        createdRows,
        updatedRows,
        unchangedRows: unchangedRowsCount,
        existingRows,
        confirmedAt,
      };
    });
  }

  async attachCreatedAdults(params: {
    importId: string;
    createdAdults: Array<{ documentType: string; documentNumber: string; adultoId: string }>;
  }): Promise<void> {
    await this.attachAdults(params.importId, params.createdAdults, "createdAdultoId");
  }

  async attachExistingAdults(params: {
    importId: string;
    existingAdults: Array<{ documentType: string; documentNumber: string; adultoId: string }>;
  }): Promise<void> {
    await this.attachAdults(params.importId, params.existingAdults, "existingAdultoId");
  }

  async insertAdultosMayores(params: {
    tenantId: string;
    requestedByUserId: string;
    rows: Array<{
      documentType: string;
      documentNumber: string;
      normalizedPayload: Record<string, unknown>;
    }>;
  }): Promise<Array<{ id: string; documentType: string; documentNumber: string }>> {
    return await this.insertAdultosMayoresWithDb(this.database.db, params);
  }

  async listImportBatchIdsByChecksum(checksum: string): Promise<string[]> {
    const rows = await this.database.db
      .select({
        id: adultoMayorImportBatches.id,
      })
      .from(adultoMayorImportBatches)
      .where(eq(adultoMayorImportBatches.fileChecksumSha256, checksum));

    return rows.map((row) => row.id);
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

  private async attachAdults(
    importId: string,
    adults: Array<{ documentType: string; documentNumber: string; adultoId: string }>,
    column: "createdAdultoId" | "existingAdultoId",
  ): Promise<void> {
    for (const adulto of adults) {
      await this.database.db
        .update(adultoMayorImportRows)
        .set({
          [column]: adulto.adultoId,
        } as never)
        .where(
          and(
            eq(adultoMayorImportRows.importBatchId, importId),
            sql`${adultoMayorImportRows.normalizedPayload}->>'documentType' = ${adulto.documentType}`,
            sql`${adultoMayorImportRows.normalizedPayload}->>'documentNumber' = ${adulto.documentNumber}`,
          ),
        );
    }
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
        updateRows: batchRow.updateRows,
        invalidRows: batchRow.invalidRows,
        warningRows: batchRow.warningRows,
        unchangedRows: batchRow.unchangedRows,
        existingRows: batchRow.existingRows,
        createdRows: batchRow.createdRows,
        updatedRows: batchRow.updatedRows,
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

  private buildNames(payload: Record<string, unknown>): string {
    return [payload.firstName, payload.middleName].filter(Boolean).map(String).join(" ");
  }

  private async assertCreateRowsStillAvailable(
    db: DatabaseLike,
    tenantId: string,
    rows: AdultoMayorImportBatchDetailRowRecord[],
  ) {
    if (rows.length === 0) {
      return;
    }

    const documentNumbers = [
      ...new Set(rows.map((row) => row.normalizedPayload?.documentNumber ?? "")),
    ];
    const foundRows = await db
      .select({
        documentType: adultosMayores.documentType,
        documentNumber: adultosMayores.documentNumber,
      })
      .from(adultosMayores)
      .where(
        and(
          eq(adultosMayores.tenantId, tenantId),
          inArray(adultosMayores.documentNumber, documentNumbers),
        ),
      );

    const expectedKeys = new Set(
      rows.map((row) =>
        this.buildDocumentKey(
          row.normalizedPayload?.documentType ?? "",
          row.normalizedPayload?.documentNumber ?? "",
        ),
      ),
    );

    if (
      foundRows.some((row) =>
        expectedKeys.has(this.buildDocumentKey(row.documentType, row.documentNumber)),
      )
    ) {
      throw new AdultoMayorImportCommitConflictError();
    }
  }

  private async insertAdultosMayoresWithDb(
    db: DatabaseLike,
    params: {
      tenantId: string;
      requestedByUserId: string;
      rows: Array<{
        documentType: string;
        documentNumber: string;
        normalizedPayload: Record<string, unknown>;
      }>;
    },
  ): Promise<Array<{ id: string; documentType: string; documentNumber: string }>> {
    if (params.rows.length === 0) {
      return [];
    }

    return await db
      .insert(adultosMayores)
      .values(
        params.rows.map((row) => ({
          tenantId: params.tenantId,
          ...this.buildAdultoMutableValues(row.normalizedPayload),
          documentType: row.documentType as never,
          documentNumber: row.documentNumber,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      )
      .onConflictDoNothing()
      .returning({
        id: adultosMayores.id,
        documentType: adultosMayores.documentType,
        documentNumber: adultosMayores.documentNumber,
      });
  }

  private buildAdultoMutableValues(payload: Record<string, unknown>) {
    return {
      names: this.buildNames(payload),
      surnames: this.buildSurnames(payload),
      firstName: String(payload.firstName),
      middleName: this.toNullableString(payload.middleName),
      firstSurname: String(payload.firstSurname),
      secondSurname: this.toNullableString(payload.secondSurname),
      educationLevel: this.toNullableString(payload.educationLevel),
      disability: this.toNullableString(payload.disability),
      populationGroup: this.toNullableString(payload.populationGroup),
      address: String(payload.address),
      departmentId: String(payload.departmentId),
      municipalityId: String(payload.municipalityId),
      department: String(payload.department),
      municipality: String(payload.municipality),
      zone: payload.zone as never,
      country: String(payload.country ?? "Colombia"),
      phone: this.toNullableString(payload.phone),
      phoneSecondary: this.toNullableString(payload.phoneSecondary),
      email: this.toNullableString(payload.email),
      emergencyContactFullName: this.toNullableString(payload.emergencyContactFullName),
      emergencyContactRelationship: this.toNullableString(payload.emergencyContactRelationship),
      emergencyContactPhone: this.toNullableString(payload.emergencyContactPhone),
      emergencyContactAddress: this.toNullableString(payload.emergencyContactAddress),
      bloodType: this.toNullableString(payload.bloodType),
      sisben: this.toNullableString(payload.sisben),
      healthRegime: this.toNullableString(payload.healthRegime),
      epsId: this.toNullableString(payload.epsId),
      eps: this.toNullableString(payload.eps),
      livesWithSomeone: Boolean(payload.livesWithSomeone),
      companion: this.toNullableString(payload.companion),
      economicIncome: this.toNullableNumber(payload.economicIncome),
      socialProgramBeneficiary: Boolean(payload.socialProgramBeneficiary),
      birthDate: String(payload.birthDate),
      sex: payload.sex as never,
      status: payload.status as never,
    };
  }

  private buildAdultoSummary(payload: Record<string, unknown>): string {
    return [payload.firstName, payload.middleName, payload.firstSurname, payload.secondSurname]
      .filter(Boolean)
      .map(String)
      .join(" ");
  }

  private buildDocumentKey(documentType: string, documentNumber: string): string {
    return `${documentType}::${documentNumber}`;
  }

  private buildSurnames(payload: Record<string, unknown>): string {
    return [payload.firstSurname, payload.secondSurname].filter(Boolean).map(String).join(" ");
  }

  private toNullableString(value: unknown): string | null {
    if (value === null || value === undefined) {
      return null;
    }

    const text = String(value).trim();
    return text === "" ? null : text;
  }

  private toNullableNumber(value: unknown): number | null {
    if (value === null || value === undefined) {
      return null;
    }

    const numberValue = Number(value);
    return Number.isFinite(numberValue) ? numberValue : null;
  }
}
