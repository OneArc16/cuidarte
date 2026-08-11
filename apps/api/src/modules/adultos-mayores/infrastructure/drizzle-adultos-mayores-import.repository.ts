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
  type AdultoMayorImportBatchDetailRowRecord,
  type AdultoMayorImportBatchRecord,
  type AdultoMayorImportBatchRowCreateCommand,
  type AdultoMayorImportCatalogMaps,
  type AdultoMayorImportNormalizedRow,
  type AdultoMayorImportValidatedRow,
} from "../domain/adulto-mayor-import.types";
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

  async findTenantById(tenantId: string): Promise<{ id: string; name: string; isActive: boolean } | null> {
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
  }): Promise<Array<{ id: string; documentType: string; documentNumber: string }>> {
    if (params.documents.length === 0) {
      return [];
    }

    const documentNumbers = [...new Set(params.documents.map((document) => document.documentNumber))];
    const rows = await this.database.db
      .select({
        id: adultosMayores.id,
        documentType: adultosMayores.documentType,
        documentNumber: adultosMayores.documentNumber,
      })
      .from(adultosMayores)
      .where(
        and(
          eq(adultosMayores.tenantId, params.tenantId),
          inArray(adultosMayores.documentNumber, documentNumbers),
        ),
      );

    const keySet = new Set(
      params.documents.map((document) => `${document.documentType}::${document.documentNumber}`),
    );

    return rows.filter((row) => keySet.has(`${row.documentType}::${row.documentNumber}`));
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
    existingRows: number;
    confirmedAt: Date;
  }): Promise<void> {
    await this.database.db
      .update(adultoMayorImportBatches)
      .set({
        status: "completed",
        createdRows: params.createdRows,
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
    if (params.rows.length === 0) {
      return [];
    }

    const inserted = await this.database.db
      .insert(adultosMayores)
      .values(
        params.rows.map((row) => ({
          tenantId: params.tenantId,
          documentType: row.documentType as never,
          documentNumber: row.documentNumber,
          names: this.buildNames(row.normalizedPayload),
          surnames: this.buildSurnames(row.normalizedPayload),
          firstName: String(row.normalizedPayload.firstName),
          middleName: this.toNullableString(row.normalizedPayload.middleName),
          firstSurname: String(row.normalizedPayload.firstSurname),
          secondSurname: this.toNullableString(row.normalizedPayload.secondSurname),
          educationLevel: this.toNullableString(row.normalizedPayload.educationLevel),
          disability: this.toNullableString(row.normalizedPayload.disability),
          populationGroup: this.toNullableString(row.normalizedPayload.populationGroup),
          address: String(row.normalizedPayload.address),
          departmentId: String(row.normalizedPayload.departmentId),
          municipalityId: String(row.normalizedPayload.municipalityId),
          department: String(row.normalizedPayload.department),
          municipality: String(row.normalizedPayload.municipality),
          zone: row.normalizedPayload.zone as never,
          country: String(row.normalizedPayload.country ?? "Colombia"),
          phone: this.toNullableString(row.normalizedPayload.phone),
          phoneSecondary: this.toNullableString(row.normalizedPayload.phoneSecondary),
          email: this.toNullableString(row.normalizedPayload.email),
          emergencyContactFullName: this.toNullableString(row.normalizedPayload.emergencyContactFullName),
          emergencyContactRelationship: this.toNullableString(
            row.normalizedPayload.emergencyContactRelationship,
          ),
          emergencyContactPhone: this.toNullableString(row.normalizedPayload.emergencyContactPhone),
          emergencyContactAddress: this.toNullableString(row.normalizedPayload.emergencyContactAddress),
          bloodType: this.toNullableString(row.normalizedPayload.bloodType),
          sisben: this.toNullableString(row.normalizedPayload.sisben),
          healthRegime: this.toNullableString(row.normalizedPayload.healthRegime),
          epsId: this.toNullableString(row.normalizedPayload.epsId),
          eps: this.toNullableString(row.normalizedPayload.eps),
          livesWithSomeone: Boolean(row.normalizedPayload.livesWithSomeone),
          companion: this.toNullableString(row.normalizedPayload.companion),
          economicIncome: this.toNullableNumber(row.normalizedPayload.economicIncome),
          socialProgramBeneficiary: Boolean(row.normalizedPayload.socialProgramBeneficiary),
          birthDate: String(row.normalizedPayload.birthDate),
          sex: row.normalizedPayload.sex as never,
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

    return inserted;
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

  private toBatchRecord(batchRow: ImportBatchRow, rows: AdultoMayorImportBatchDetailRowRecord[]): AdultoMayorImportBatchRecord {
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

  private buildNames(payload: Record<string, unknown>): string {
    return [payload.firstName, payload.middleName].filter(Boolean).map(String).join(" ");
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
