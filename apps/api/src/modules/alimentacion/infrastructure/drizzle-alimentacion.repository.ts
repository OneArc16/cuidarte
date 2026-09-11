import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  adultosMayores,
  alimentacionFormatoEmissions,
  alimentacionFormatoImportedVersions,
  alimentacionRegistros,
  auditLogs,
  tenants,
  users,
} from "../../../database/schema";
import {
  type AlimentacionAdultoOptionRecord,
  type AlimentacionFormatoEmissionRecord,
  type AlimentacionFormatoEntregaRecord,
  type AlimentacionFormatoReportCandidateRecord,
  type AlimentacionImportedFormatoVersionRecord,
  type AlimentacionRecord,
  type AlimentacionTenantOptionRecord,
  type CreateAlimentacionFormatoEmissionCommand,
  type CreateAlimentacionImportedFormatoVersionCommand,
  type CreateAlimentacionFormatoEntregaExportAuditCommand,
  type CreateAlimentacionImportedFormatoDownloadAuditCommand,
  type CreateAlimentacionBatchRecordCommand,
  type DeleteAlimentacionRecordCommand,
  type FindAlimentacionAdultoMayorByIdQuery,
  type FindLatestAlimentacionFormatoEmissionQuery,
  type FindAlimentacionFormatoEntregaByAdultoAndMonthQuery,
  type FindAlimentacionImportedFormatoVersionByIdQuery,
  type FindAlimentacionImportedFormatoVersionsQuery,
  type FindAlimentacionExistingRecordsByAdultosAndDateQuery,
  type FindAlimentacionRecordByAdultoMayorAndDateQuery,
  type FindAlimentacionRecordByIdQuery,
  type FindAlimentacionRecordsQuery,
  type UpdateAlimentacionRecordCommand,
  type SearchAlimentacionAdultosMayoresOptionsQuery,
} from "../domain/alimentacion.types";
import { type AlimentacionRepository } from "../domain/alimentacion.repository";

type AlimentacionRecordRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  documentNumber: string;
  names: string;
  surnames: string;
  deliveryDate: string;
  organizer: AlimentacionRecord["organizer"];
  refrigerio1: AlimentacionRecord["refrigerio1"];
  almuerzo: AlimentacionRecord["almuerzo"];
  refrigerio2: AlimentacionRecord["refrigerio2"];
  auxilioTransporte: AlimentacionRecord["auxilioTransporte"];
  createdAt: Date;
  updatedAt: Date;
};

type AlimentacionAdultoOptionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  tenantCity: string | null;
  tenantDepartment: string | null;
  documentNumber: string;
  names: string;
  surnames: string;
};

type AlimentacionFormatoEntregaRow = {
  tenantId: string;
  tenantName: string;
  tenantCity: string | null;
  tenantDepartment: string | null;
  adultoMayorId: string;
  documentNumber: string;
  names: string;
  surnames: string;
  deliveryDate: string;
  organizer: AlimentacionRecord["organizer"];
  refrigerio1: AlimentacionRecord["refrigerio1"];
  almuerzo: AlimentacionRecord["almuerzo"];
  refrigerio2: AlimentacionRecord["refrigerio2"];
  auxilioTransporte: AlimentacionRecord["auxilioTransporte"];
  updatedAt: Date;
};

type AlimentacionFormatoEmissionRow = {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  version: number;
  signerEmployeeIdSnapshot: string;
  signerNameSnapshot: string;
  signerRoleSnapshot: string;
  signatureVersionIdSnapshot: string;
  tenantLogoVersionIdSnapshot: string | null;
  filename: string;
  pdfRelativePath: string;
  sourceRecordCount: number;
  sourceDateFrom: string | null;
  sourceDateTo: string | null;
  issuedByUserId: string;
  issuedAt: Date;
};

type AlimentacionImportedFormatoVersionRow = {
  id: string;
  tenantId: string;
  adultoMayorId: string;
  deliveryMonth: string;
  version: number;
  source: string;
  originalName: string;
  storedName: string;
  pdfRelativePath: string;
  mimeType: string;
  sizeBytes: number;
  importedByUserId: string;
  importedByUserFullName: string;
  importedAt: Date;
};

@Injectable()
export class DrizzleAlimentacionRepository implements AlimentacionRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(query: FindAlimentacionRecordsQuery): Promise<AlimentacionRecord[]> {
    const rows = await this.database.db
      .select(this.getRecordSelection())
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
      .where(this.buildWhere(query))
      .orderBy(
        desc(alimentacionRegistros.deliveryDate),
        asc(adultosMayores.surnames),
        asc(adultosMayores.names),
      );

    return await this.attachLatestImportedFormatos(rows.map((row) => this.toRecord(row)));
  }

  async findById(query: FindAlimentacionRecordByIdQuery): Promise<AlimentacionRecord | null> {
    const [row] = await this.database.db
      .select(this.getRecordSelection())
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
      .where(this.buildScopedWhere(query.scope, [eq(alimentacionRegistros.id, query.id)]))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async findTenantOptions(): Promise<AlimentacionTenantOptionRecord[]> {
    return await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .orderBy(asc(tenants.name));
  }

  async searchAdultosMayoresOptions(
    query: SearchAlimentacionAdultosMayoresOptionsQuery,
  ): Promise<AlimentacionAdultoOptionRecord[]> {
    const conditions: SQL[] = [
      eq(adultosMayores.tenantId, query.tenantId),
      isNull(alimentacionRegistros.id),
    ];

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;

      conditions.push(
        or(
          ilike(adultosMayores.documentNumber, searchPattern),
          ilike(adultosMayores.names, searchPattern),
          ilike(adultosMayores.surnames, searchPattern),
        )!,
      );
    }

    const rows = await this.database.db
      .select({
        id: adultosMayores.id,
        tenantId: adultosMayores.tenantId,
        tenantName: tenants.name,
        tenantCity: tenants.city,
        tenantDepartment: tenants.department,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
      })
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .leftJoin(
        alimentacionRegistros,
        and(
          eq(alimentacionRegistros.adultoMayorId, adultosMayores.id),
          eq(alimentacionRegistros.deliveryDate, query.deliveryDate),
        ),
      )
      .where(and(...conditions))
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names))
      .limit(query.limit === "all" ? 1_000 : 12);

    return rows.map((row) => this.toAdultoOption(row));
  }

  async findAdultosMayoresByIds(
    tenantId: string,
    adultoMayorIds: string[],
  ): Promise<AlimentacionAdultoOptionRecord[]> {
    if (adultoMayorIds.length === 0) {
      return [];
    }

    const rows = await this.database.db
      .select({
        id: adultosMayores.id,
        tenantId: adultosMayores.tenantId,
        tenantName: tenants.name,
        tenantCity: tenants.city,
        tenantDepartment: tenants.department,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
      })
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .where(and(eq(adultosMayores.tenantId, tenantId), inArray(adultosMayores.id, adultoMayorIds)))
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names));

    return rows.map((row) => this.toAdultoOption(row));
  }

  async findAdultoMayorById(
    query: FindAlimentacionAdultoMayorByIdQuery,
  ): Promise<AlimentacionAdultoOptionRecord | null> {
    const conditions: SQL[] = [eq(adultosMayores.id, query.adultoMayorId)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(adultosMayores.tenantId, query.scope.tenantId));
    }

    const [row] = await this.database.db
      .select({
        id: adultosMayores.id,
        tenantId: adultosMayores.tenantId,
        tenantName: tenants.name,
        tenantCity: tenants.city,
        tenantDepartment: tenants.department,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
      })
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : this.toAdultoOption(row);
  }

  async findFormatoEntregaByAdultoAndMonth(
    query: FindAlimentacionFormatoEntregaByAdultoAndMonthQuery,
  ): Promise<AlimentacionFormatoEntregaRecord[]> {
    const monthRange = resolveMonthRange(query.deliveryMonth);
    const scopedConditions: SQL[] =
      query.scope.type === "tenant"
        ? [eq(alimentacionRegistros.tenantId, query.scope.tenantId)]
        : [];

    const rows = await this.database.db
      .select({
        tenantId: alimentacionRegistros.tenantId,
        tenantName: tenants.name,
        tenantCity: tenants.city,
        tenantDepartment: tenants.department,
        adultoMayorId: alimentacionRegistros.adultoMayorId,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
        deliveryDate: alimentacionRegistros.deliveryDate,
        organizer: alimentacionRegistros.organizer,
        refrigerio1: alimentacionRegistros.refrigerio1,
        almuerzo: alimentacionRegistros.almuerzo,
        refrigerio2: alimentacionRegistros.refrigerio2,
        auxilioTransporte: alimentacionRegistros.auxilioTransporte,
        updatedAt: alimentacionRegistros.updatedAt,
      })
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
      .where(
        and(
          eq(alimentacionRegistros.adultoMayorId, query.adultoMayorId),
          gte(alimentacionRegistros.deliveryDate, monthRange.startDate),
          lt(alimentacionRegistros.deliveryDate, monthRange.endDateExclusive),
          ...scopedConditions,
        ),
      )
      .orderBy(asc(alimentacionRegistros.deliveryDate));

    return rows.map((row) => this.toFormatoEntregaRecord(row));
  }

  async findLatestFormatoEntregaEmission(
    query: FindLatestAlimentacionFormatoEmissionQuery,
  ): Promise<AlimentacionFormatoEmissionRecord | null> {
    const conditions: SQL[] = [
      eq(alimentacionFormatoEmissions.adultoMayorId, query.adultoMayorId),
      eq(alimentacionFormatoEmissions.deliveryMonth, query.deliveryMonth),
    ];

    if (query.scope.type === "tenant") {
      conditions.push(eq(alimentacionFormatoEmissions.tenantId, query.scope.tenantId));
    }

    const [row] = await this.database.db
      .select({
        id: alimentacionFormatoEmissions.id,
        tenantId: alimentacionFormatoEmissions.tenantId,
        adultoMayorId: alimentacionFormatoEmissions.adultoMayorId,
        deliveryMonth: alimentacionFormatoEmissions.deliveryMonth,
        version: alimentacionFormatoEmissions.version,
        signerEmployeeIdSnapshot: alimentacionFormatoEmissions.signerEmployeeIdSnapshot,
        signerNameSnapshot: alimentacionFormatoEmissions.signerNameSnapshot,
        signerRoleSnapshot: alimentacionFormatoEmissions.signerRoleSnapshot,
        signatureVersionIdSnapshot: alimentacionFormatoEmissions.signatureVersionIdSnapshot,
        tenantLogoVersionIdSnapshot: alimentacionFormatoEmissions.tenantLogoVersionIdSnapshot,
        filename: alimentacionFormatoEmissions.filename,
        pdfRelativePath: alimentacionFormatoEmissions.pdfRelativePath,
        sourceRecordCount: alimentacionFormatoEmissions.sourceRecordCount,
        sourceDateFrom: alimentacionFormatoEmissions.sourceDateFrom,
        sourceDateTo: alimentacionFormatoEmissions.sourceDateTo,
        issuedByUserId: alimentacionFormatoEmissions.issuedByUserId,
        issuedAt: alimentacionFormatoEmissions.issuedAt,
      })
      .from(alimentacionFormatoEmissions)
      .where(and(...conditions))
      .orderBy(
        desc(alimentacionFormatoEmissions.version),
        desc(alimentacionFormatoEmissions.issuedAt),
      )
      .limit(1);

    return row === undefined ? null : this.toFormatoEmissionRecord(row);
  }

  async findFormatoEntregaReportCandidates(query: {
    tenantId: string;
    deliveryMonth: string;
  }): Promise<AlimentacionFormatoReportCandidateRecord[]> {
    const monthRange = resolveMonthRange(query.deliveryMonth);
    const rows = await this.database.db
      .select({
        tenantId: adultosMayores.tenantId,
        tenantName: tenants.name,
        adultoMayorId: adultosMayores.id,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
      })
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .leftJoin(
        alimentacionRegistros,
        and(
          eq(alimentacionRegistros.adultoMayorId, adultosMayores.id),
          gte(alimentacionRegistros.deliveryDate, monthRange.startDate),
          lt(alimentacionRegistros.deliveryDate, monthRange.endDateExclusive),
        ),
      )
      .leftJoin(
        alimentacionFormatoImportedVersions,
        and(
          eq(alimentacionFormatoImportedVersions.adultoMayorId, adultosMayores.id),
          eq(alimentacionFormatoImportedVersions.deliveryMonth, query.deliveryMonth),
        ),
      )
      .where(
        and(
          eq(adultosMayores.tenantId, query.tenantId),
          or(
            eq(alimentacionRegistros.tenantId, query.tenantId),
            eq(alimentacionFormatoImportedVersions.tenantId, query.tenantId),
          ),
        ),
      )
      .groupBy(
        adultosMayores.tenantId,
        tenants.name,
        adultosMayores.id,
        adultosMayores.documentNumber,
        adultosMayores.names,
        adultosMayores.surnames,
      )
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names));

    const importedVersions = await this.findLatestImportedFormatoByAdultoIds(
      query.tenantId,
      query.deliveryMonth,
      rows.map((row) => row.adultoMayorId),
    );

    return rows.map((row) => ({
      ...row,
      deliveryMonth: query.deliveryMonth,
      importedVersion: importedVersions.get(row.adultoMayorId) ?? null,
    }));
  }

  async findImportedFormatoVersions(
    query: FindAlimentacionImportedFormatoVersionsQuery,
  ): Promise<AlimentacionImportedFormatoVersionRecord[]> {
    const rows = await this.database.db
      .select(this.getImportedFormatoVersionSelection())
      .from(alimentacionFormatoImportedVersions)
      .innerJoin(users, eq(users.id, alimentacionFormatoImportedVersions.importedByUserId))
      .where(
        and(
          eq(alimentacionFormatoImportedVersions.tenantId, query.tenantId),
          eq(alimentacionFormatoImportedVersions.adultoMayorId, query.adultoMayorId),
          eq(alimentacionFormatoImportedVersions.deliveryMonth, query.deliveryMonth),
        ),
      )
      .orderBy(
        desc(alimentacionFormatoImportedVersions.version),
        desc(alimentacionFormatoImportedVersions.importedAt),
      );

    return rows.map((row) => this.toImportedFormatoVersionRecord(row));
  }

  async findImportedFormatoVersionById(
    query: FindAlimentacionImportedFormatoVersionByIdQuery,
  ): Promise<AlimentacionImportedFormatoVersionRecord | null> {
    const [row] = await this.database.db
      .select(this.getImportedFormatoVersionSelection())
      .from(alimentacionFormatoImportedVersions)
      .innerJoin(users, eq(users.id, alimentacionFormatoImportedVersions.importedByUserId))
      .where(
        and(
          eq(alimentacionFormatoImportedVersions.id, query.id),
          eq(alimentacionFormatoImportedVersions.tenantId, query.tenantId),
          eq(alimentacionFormatoImportedVersions.adultoMayorId, query.adultoMayorId),
        ),
      )
      .limit(1);

    return row === undefined ? null : this.toImportedFormatoVersionRecord(row);
  }

  async findExistingByAdultosAndDate(
    query: FindAlimentacionExistingRecordsByAdultosAndDateQuery,
  ): Promise<AlimentacionRecord[]> {
    if (query.adultoMayorIds.length === 0) {
      return [];
    }

    const rows = await this.database.db
      .select(this.getRecordSelection())
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
      .where(
        and(
          eq(alimentacionRegistros.tenantId, query.tenantId),
          eq(alimentacionRegistros.deliveryDate, query.deliveryDate),
          inArray(alimentacionRegistros.adultoMayorId, query.adultoMayorIds),
        ),
      )
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names));

    return rows.map((row) => this.toRecord(row));
  }

  async findByAdultoMayorAndDate(
    query: FindAlimentacionRecordByAdultoMayorAndDateQuery,
  ): Promise<AlimentacionRecord | null> {
    const conditions: SQL[] = [
      eq(alimentacionRegistros.tenantId, query.tenantId),
      eq(alimentacionRegistros.adultoMayorId, query.adultoMayorId),
      eq(alimentacionRegistros.deliveryDate, query.deliveryDate),
    ];

    if (query.excludeId !== undefined) {
      conditions.push(ne(alimentacionRegistros.id, query.excludeId));
    }

    const [row] = await this.database.db
      .select(this.getRecordSelection())
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : this.toRecord(row);
  }

  async createMany(command: CreateAlimentacionBatchRecordCommand): Promise<number> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const createdRows = await tx
        .insert(alimentacionRegistros)
        .values(
          command.registros.map((registro) => ({
            tenantId: command.tenantId,
            adultoMayorId: registro.adultoMayorId,
            deliveryDate: command.deliveryDate,
            organizer: command.organizer,
            refrigerio1: registro.refrigerio1,
            almuerzo: registro.almuerzo,
            refrigerio2: registro.refrigerio2,
            auxilioTransporte: registro.auxilioTransporte,
            createdByUserId: command.actorUserId,
            updatedByUserId: command.actorUserId,
            createdAt: now,
            updatedAt: now,
          })),
        )
        .returning({ id: alimentacionRegistros.id });

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "alimentacion.created",
        targetTenantId: command.tenantId,
        summary: `Registros de alimentacion creados: ${createdRows.length}`,
        metadata: {
          deliveryDate: command.deliveryDate,
          organizer: command.organizer,
          createdCount: createdRows.length,
        },
      });

      return createdRows.length;
    });
  }

  async update(command: UpdateAlimentacionRecordCommand): Promise<AlimentacionRecord> {
    return await this.database.db.transaction(async (tx) => {
      const [beforeRow] = await tx
        .select(this.getRecordSelection())
        .from(alimentacionRegistros)
        .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
        .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
        .where(eq(alimentacionRegistros.id, command.id))
        .limit(1);

      if (beforeRow === undefined) {
        throw new Error("No fue posible consultar el registro de alimentacion a actualizar.");
      }

      await tx
        .update(alimentacionRegistros)
        .set({
          deliveryDate: command.deliveryDate,
          organizer: command.organizer,
          refrigerio1: command.refrigerio1,
          almuerzo: command.almuerzo,
          refrigerio2: command.refrigerio2,
          auxilioTransporte: command.auxilioTransporte,
          updatedByUserId: command.actorUserId,
          updatedAt: new Date(),
        })
        .where(eq(alimentacionRegistros.id, command.id));

      const [afterRow] = await tx
        .select(this.getRecordSelection())
        .from(alimentacionRegistros)
        .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
        .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
        .where(eq(alimentacionRegistros.id, command.id))
        .limit(1);

      if (afterRow === undefined) {
        throw new Error("No fue posible consultar el registro de alimentacion actualizado.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "alimentacion.updated",
        targetTenantId: afterRow.tenantId,
        summary: `Registro de alimentacion actualizado: ${afterRow.names} ${afterRow.surnames}`,
        metadata: {
          before: {
            deliveryDate: beforeRow.deliveryDate,
            organizer: beforeRow.organizer,
            refrigerio1: beforeRow.refrigerio1,
            almuerzo: beforeRow.almuerzo,
            refrigerio2: beforeRow.refrigerio2,
            auxilioTransporte: beforeRow.auxilioTransporte,
          },
          after: {
            deliveryDate: afterRow.deliveryDate,
            organizer: afterRow.organizer,
            refrigerio1: afterRow.refrigerio1,
            almuerzo: afterRow.almuerzo,
            refrigerio2: afterRow.refrigerio2,
            auxilioTransporte: afterRow.auxilioTransporte,
          },
        },
      });

      return this.toRecord(afterRow);
    });
  }

  async delete(command: DeleteAlimentacionRecordCommand): Promise<AlimentacionRecord | null> {
    return await this.database.db.transaction(async (tx) => {
      const [row] = await tx
        .select(this.getRecordSelection())
        .from(alimentacionRegistros)
        .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
        .innerJoin(tenants, eq(tenants.id, alimentacionRegistros.tenantId))
        .where(this.buildScopedWhere(command.scope, [eq(alimentacionRegistros.id, command.id)]))
        .limit(1);

      if (row === undefined) {
        return null;
      }

      const deletedRecord = this.toRecord(row);

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "alimentacion.deleted",
        targetTenantId: deletedRecord.tenantId,
        summary: `Registro de alimentacion eliminado: ${deletedRecord.fullName} (${deletedRecord.deliveryDate})`,
        metadata: {
          record: this.toAuditRecordSnapshot(deletedRecord),
        },
      });

      await tx.delete(alimentacionRegistros).where(eq(alimentacionRegistros.id, command.id));

      return deletedRecord;
    });
  }

  async createFormatoEntregaExportAudit(
    command: CreateAlimentacionFormatoEntregaExportAuditCommand,
  ): Promise<void> {
    await this.database.db.insert(auditLogs).values({
      actorUserId: command.actorUserId,
      action: "alimentacion.formato_exported",
      targetTenantId: command.targetTenantId,
      summary: `Formato de alimentacion exportado (${command.deliveryMonth})`,
      metadata: {
        adultoMayorId: command.adultoMayorId,
        deliveryMonth: command.deliveryMonth,
      },
    });
  }

  async createImportedFormatoDownloadAudit(
    command: CreateAlimentacionImportedFormatoDownloadAuditCommand,
  ): Promise<void> {
    await this.database.db.insert(auditLogs).values({
      actorUserId: command.actorUserId,
      action: "alimentacion.formato_imported_downloaded",
      targetTenantId: command.targetTenantId,
      summary: `Formato de alimentacion importado descargado (${command.deliveryMonth}) v${command.version}`,
      metadata: {
        adultoMayorId: command.adultoMayorId,
        deliveryMonth: command.deliveryMonth,
        versionId: command.versionId,
        version: command.version,
        source: "importado",
      },
    });
  }

  async createFormatoEntregaEmission(
    command: CreateAlimentacionFormatoEmissionCommand,
  ): Promise<AlimentacionFormatoEmissionRecord> {
    const createdId = await this.database.db.transaction(async (tx) => {
      const [latestVersionRow] = await tx
        .select({
          version: alimentacionFormatoEmissions.version,
        })
        .from(alimentacionFormatoEmissions)
        .where(
          and(
            eq(alimentacionFormatoEmissions.adultoMayorId, command.adultoMayorId),
            eq(alimentacionFormatoEmissions.deliveryMonth, command.deliveryMonth),
          ),
        )
        .orderBy(desc(alimentacionFormatoEmissions.version))
        .limit(1);

      const nextVersion = (latestVersionRow?.version ?? 0) + 1;
      const [created] = await tx
        .insert(alimentacionFormatoEmissions)
        .values({
          tenantId: command.tenantId,
          adultoMayorId: command.adultoMayorId,
          deliveryMonth: command.deliveryMonth,
          version: nextVersion,
          signerEmployeeIdSnapshot: command.signerEmployeeIdSnapshot,
          signerNameSnapshot: command.signerNameSnapshot,
          signerRoleSnapshot: command.signerRoleSnapshot,
          signatureVersionIdSnapshot: command.signatureVersionIdSnapshot,
          tenantLogoVersionIdSnapshot: command.tenantLogoVersionIdSnapshot,
          filename: command.filename,
          pdfRelativePath: command.pdfRelativePath,
          sourceRecordCount: command.sourceRecordCount,
          sourceDateFrom: command.sourceDateFrom,
          sourceDateTo: command.sourceDateTo,
          issuedByUserId: command.issuedByUserId,
          issuedAt: command.issuedAt,
        })
        .returning({
          id: alimentacionFormatoEmissions.id,
          version: alimentacionFormatoEmissions.version,
        });

      if (created === undefined) {
        throw new Error("No fue posible guardar la emision del formato de alimentacion.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.issuedByUserId,
        action:
          created.version === 1 ? "alimentacion.formato_emitted" : "alimentacion.formato_reissued",
        targetTenantId: command.tenantId,
        summary:
          created.version === 1
            ? `Formato de alimentacion emitido (${command.deliveryMonth})`
            : `Formato de alimentacion reemitido (${command.deliveryMonth}) v${created.version}`,
        metadata: {
          adultoMayorId: command.adultoMayorId,
          deliveryMonth: command.deliveryMonth,
          version: created.version,
          signerEmployeeIdSnapshot: command.signerEmployeeIdSnapshot,
          signatureVersionIdSnapshot: command.signatureVersionIdSnapshot,
          tenantLogoVersionIdSnapshot: command.tenantLogoVersionIdSnapshot,
        },
      });

      return created.id;
    });

    const emission = await this.getFormatoEntregaEmissionById(createdId);

    if (emission === null) {
      throw new Error("No fue posible consultar la emision del formato de alimentacion.");
    }

    return emission;
  }

  async createImportedFormatoVersion(
    command: CreateAlimentacionImportedFormatoVersionCommand,
  ): Promise<AlimentacionImportedFormatoVersionRecord> {
    const createdId = await this.database.db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`alimentacion-import:${command.adultoMayorId}:${command.deliveryMonth}`}))`,
      );

      const [latestVersionRow] = await tx
        .select({ version: alimentacionFormatoImportedVersions.version })
        .from(alimentacionFormatoImportedVersions)
        .where(
          and(
            eq(alimentacionFormatoImportedVersions.adultoMayorId, command.adultoMayorId),
            eq(alimentacionFormatoImportedVersions.deliveryMonth, command.deliveryMonth),
          ),
        )
        .orderBy(desc(alimentacionFormatoImportedVersions.version))
        .limit(1);
      const nextVersion = (latestVersionRow?.version ?? 0) + 1;
      const [created] = await tx
        .insert(alimentacionFormatoImportedVersions)
        .values({
          tenantId: command.tenantId,
          adultoMayorId: command.adultoMayorId,
          deliveryMonth: command.deliveryMonth,
          version: nextVersion,
          source: "importado",
          originalName: command.originalName,
          storedName: command.storedName,
          pdfRelativePath: command.pdfRelativePath,
          mimeType: command.mimeType,
          sizeBytes: command.sizeBytes,
          importedByUserId: command.importedByUserId,
          importedAt: command.importedAt,
        })
        .returning({
          id: alimentacionFormatoImportedVersions.id,
          version: alimentacionFormatoImportedVersions.version,
        });

      if (created === undefined) {
        throw new Error("No fue posible guardar la version importada del formato de alimentacion.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.importedByUserId,
        action: "alimentacion.formato_imported",
        targetTenantId: command.tenantId,
        summary:
          created.version === 1
            ? `Formato de alimentacion importado (${command.deliveryMonth})`
            : `Formato de alimentacion importado (${command.deliveryMonth}) v${created.version}`,
        metadata: {
          adultoMayorId: command.adultoMayorId,
          deliveryMonth: command.deliveryMonth,
          version: created.version,
          originalName: command.originalName,
          sizeBytes: command.sizeBytes,
          source: "importado",
        },
      });

      return created.id;
    });

    const importedVersion = await this.findImportedFormatoVersionById({
      id: createdId,
      tenantId: command.tenantId,
      adultoMayorId: command.adultoMayorId,
    });

    if (importedVersion === null) {
      throw new Error("No fue posible consultar la version importada del formato de alimentacion.");
    }

    return importedVersion;
  }

  private getRecordSelection() {
    return {
      id: alimentacionRegistros.id,
      tenantId: alimentacionRegistros.tenantId,
      tenantName: tenants.name,
      adultoMayorId: alimentacionRegistros.adultoMayorId,
      documentNumber: adultosMayores.documentNumber,
      names: adultosMayores.names,
      surnames: adultosMayores.surnames,
      deliveryDate: alimentacionRegistros.deliveryDate,
      organizer: alimentacionRegistros.organizer,
      refrigerio1: alimentacionRegistros.refrigerio1,
      almuerzo: alimentacionRegistros.almuerzo,
      refrigerio2: alimentacionRegistros.refrigerio2,
      auxilioTransporte: alimentacionRegistros.auxilioTransporte,
      createdAt: alimentacionRegistros.createdAt,
      updatedAt: alimentacionRegistros.updatedAt,
    };
  }

  private getImportedFormatoVersionSelection() {
    return {
      id: alimentacionFormatoImportedVersions.id,
      tenantId: alimentacionFormatoImportedVersions.tenantId,
      adultoMayorId: alimentacionFormatoImportedVersions.adultoMayorId,
      deliveryMonth: alimentacionFormatoImportedVersions.deliveryMonth,
      version: alimentacionFormatoImportedVersions.version,
      source: alimentacionFormatoImportedVersions.source,
      originalName: alimentacionFormatoImportedVersions.originalName,
      storedName: alimentacionFormatoImportedVersions.storedName,
      pdfRelativePath: alimentacionFormatoImportedVersions.pdfRelativePath,
      mimeType: alimentacionFormatoImportedVersions.mimeType,
      sizeBytes: alimentacionFormatoImportedVersions.sizeBytes,
      importedByUserId: alimentacionFormatoImportedVersions.importedByUserId,
      importedByUserFullName: users.fullName,
      importedAt: alimentacionFormatoImportedVersions.importedAt,
    };
  }

  private buildWhere(query: FindAlimentacionRecordsQuery): SQL | undefined {
    const conditions: SQL[] = [];

    if (query.scope.type === "tenant") {
      conditions.push(eq(alimentacionRegistros.tenantId, query.scope.tenantId));
    } else if (query.tenantId !== null) {
      conditions.push(eq(alimentacionRegistros.tenantId, query.tenantId));
    }

    if (query.deliveryMonth !== null) {
      const monthRange = resolveMonthRange(query.deliveryMonth);

      conditions.push(
        gte(alimentacionRegistros.deliveryDate, monthRange.startDate),
        lt(alimentacionRegistros.deliveryDate, monthRange.endDateExclusive),
      );
    }

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;

      conditions.push(
        or(
          ilike(adultosMayores.documentNumber, searchPattern),
          ilike(adultosMayores.names, searchPattern),
          ilike(adultosMayores.surnames, searchPattern),
          ilike(tenants.name, searchPattern),
          sql`${alimentacionRegistros.organizer}::text ilike ${searchPattern}`,
        )!,
      );
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildScopedWhere(scope: FindAlimentacionRecordByIdQuery["scope"], extra: SQL[]) {
    const conditions = [...extra];

    if (scope.type === "tenant") {
      conditions.push(eq(alimentacionRegistros.tenantId, scope.tenantId));
    }

    return and(...conditions);
  }

  private toAdultoOption(row: AlimentacionAdultoOptionRow): AlimentacionAdultoOptionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantCity: row.tenantCity,
      tenantDepartment: row.tenantDepartment,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
    };
  }

  private toRecord(row: AlimentacionRecordRow): AlimentacionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      adultoMayorId: row.adultoMayorId,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
      deliveryDate: row.deliveryDate,
      organizer: row.organizer,
      refrigerio1: row.refrigerio1,
      almuerzo: row.almuerzo,
      refrigerio2: row.refrigerio2,
      auxilioTransporte: row.auxilioTransporte,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      importedFormato: null,
    };
  }

  private toAuditRecordSnapshot(record: AlimentacionRecord) {
    return {
      id: record.id,
      tenantId: record.tenantId,
      tenantName: record.tenantName,
      adultoMayorId: record.adultoMayorId,
      documentNumber: record.documentNumber,
      fullName: record.fullName,
      deliveryDate: record.deliveryDate,
      organizer: record.organizer,
      refrigerio1: record.refrigerio1,
      almuerzo: record.almuerzo,
      refrigerio2: record.refrigerio2,
      auxilioTransporte: record.auxilioTransporte,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
      importedFormato:
        record.importedFormato === null
          ? null
          : {
              id: record.importedFormato.id,
              tenantId: record.importedFormato.tenantId,
              adultoMayorId: record.importedFormato.adultoMayorId,
              deliveryMonth: record.importedFormato.deliveryMonth,
              version: record.importedFormato.version,
              source: record.importedFormato.source,
              originalName: record.importedFormato.originalName,
              storedName: record.importedFormato.storedName,
              pdfRelativePath: record.importedFormato.pdfRelativePath,
              mimeType: record.importedFormato.mimeType,
              sizeBytes: record.importedFormato.sizeBytes,
              importedByUserId: record.importedFormato.importedByUserId,
              importedByUserFullName: record.importedFormato.importedByUserFullName,
              importedAt: record.importedFormato.importedAt.toISOString(),
            },
    };
  }

  private async attachLatestImportedFormatos(
    records: AlimentacionRecord[],
  ): Promise<AlimentacionRecord[]> {
    if (records.length === 0) {
      return records;
    }

    const uniqueScopes = Array.from(
      new Map(
        records.map((record) => [
          `${record.tenantId}:${record.adultoMayorId}:${record.deliveryDate.slice(0, 7)}`,
          {
            tenantId: record.tenantId,
            adultoMayorId: record.adultoMayorId,
            deliveryMonth: record.deliveryDate.slice(0, 7),
          },
        ]),
      ).values(),
    );
    const conditions = uniqueScopes.map((scope) =>
      and(
        eq(alimentacionFormatoImportedVersions.tenantId, scope.tenantId),
        eq(alimentacionFormatoImportedVersions.adultoMayorId, scope.adultoMayorId),
        eq(alimentacionFormatoImportedVersions.deliveryMonth, scope.deliveryMonth),
      ),
    );
    const rows = await this.database.db
      .select(this.getImportedFormatoVersionSelection())
      .from(alimentacionFormatoImportedVersions)
      .innerJoin(users, eq(users.id, alimentacionFormatoImportedVersions.importedByUserId))
      .where(or(...conditions))
      .orderBy(
        desc(alimentacionFormatoImportedVersions.version),
        desc(alimentacionFormatoImportedVersions.importedAt),
      );
    const latestByScope = new Map<string, AlimentacionImportedFormatoVersionRecord>();

    for (const row of rows) {
      const version = this.toImportedFormatoVersionRecord(row);
      const key = `${version.tenantId}:${version.adultoMayorId}:${version.deliveryMonth}`;

      if (!latestByScope.has(key)) {
        latestByScope.set(key, version);
      }
    }

    return records.map((record) => ({
      ...record,
      importedFormato:
        latestByScope.get(
          `${record.tenantId}:${record.adultoMayorId}:${record.deliveryDate.slice(0, 7)}`,
        ) ?? null,
    }));
  }

  private async findLatestImportedFormatoByAdultoIds(
    tenantId: string,
    deliveryMonth: string,
    adultoMayorIds: string[],
  ): Promise<Map<string, AlimentacionImportedFormatoVersionRecord>> {
    if (adultoMayorIds.length === 0) {
      return new Map();
    }

    const rows = await this.database.db
      .select(this.getImportedFormatoVersionSelection())
      .from(alimentacionFormatoImportedVersions)
      .innerJoin(users, eq(users.id, alimentacionFormatoImportedVersions.importedByUserId))
      .where(
        and(
          eq(alimentacionFormatoImportedVersions.tenantId, tenantId),
          eq(alimentacionFormatoImportedVersions.deliveryMonth, deliveryMonth),
          inArray(alimentacionFormatoImportedVersions.adultoMayorId, adultoMayorIds),
        ),
      )
      .orderBy(
        asc(alimentacionFormatoImportedVersions.adultoMayorId),
        desc(alimentacionFormatoImportedVersions.version),
      );
    const latestByAdultoMayorId = new Map<string, AlimentacionImportedFormatoVersionRecord>();

    for (const row of rows) {
      if (!latestByAdultoMayorId.has(row.adultoMayorId)) {
        latestByAdultoMayorId.set(row.adultoMayorId, this.toImportedFormatoVersionRecord(row));
      }
    }

    return latestByAdultoMayorId;
  }

  private toFormatoEntregaRecord(
    row: AlimentacionFormatoEntregaRow,
  ): AlimentacionFormatoEntregaRecord {
    return {
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      tenantCity: row.tenantCity,
      tenantDepartment: row.tenantDepartment,
      adultoMayorId: row.adultoMayorId,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
      deliveryDate: row.deliveryDate,
      organizer: row.organizer,
      refrigerio1: row.refrigerio1,
      almuerzo: row.almuerzo,
      refrigerio2: row.refrigerio2,
      auxilioTransporte: row.auxilioTransporte,
      updatedAt: row.updatedAt,
    };
  }

  private async getFormatoEntregaEmissionById(
    emissionId: string,
  ): Promise<AlimentacionFormatoEmissionRecord | null> {
    const [row] = await this.database.db
      .select({
        id: alimentacionFormatoEmissions.id,
        tenantId: alimentacionFormatoEmissions.tenantId,
        adultoMayorId: alimentacionFormatoEmissions.adultoMayorId,
        deliveryMonth: alimentacionFormatoEmissions.deliveryMonth,
        version: alimentacionFormatoEmissions.version,
        signerEmployeeIdSnapshot: alimentacionFormatoEmissions.signerEmployeeIdSnapshot,
        signerNameSnapshot: alimentacionFormatoEmissions.signerNameSnapshot,
        signerRoleSnapshot: alimentacionFormatoEmissions.signerRoleSnapshot,
        signatureVersionIdSnapshot: alimentacionFormatoEmissions.signatureVersionIdSnapshot,
        tenantLogoVersionIdSnapshot: alimentacionFormatoEmissions.tenantLogoVersionIdSnapshot,
        filename: alimentacionFormatoEmissions.filename,
        pdfRelativePath: alimentacionFormatoEmissions.pdfRelativePath,
        sourceRecordCount: alimentacionFormatoEmissions.sourceRecordCount,
        sourceDateFrom: alimentacionFormatoEmissions.sourceDateFrom,
        sourceDateTo: alimentacionFormatoEmissions.sourceDateTo,
        issuedByUserId: alimentacionFormatoEmissions.issuedByUserId,
        issuedAt: alimentacionFormatoEmissions.issuedAt,
      })
      .from(alimentacionFormatoEmissions)
      .where(eq(alimentacionFormatoEmissions.id, emissionId))
      .limit(1);

    return row === undefined ? null : this.toFormatoEmissionRecord(row);
  }

  private toFormatoEmissionRecord(
    row: AlimentacionFormatoEmissionRow,
  ): AlimentacionFormatoEmissionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      adultoMayorId: row.adultoMayorId,
      deliveryMonth: row.deliveryMonth,
      version: row.version,
      signerEmployeeIdSnapshot: row.signerEmployeeIdSnapshot,
      signerNameSnapshot: row.signerNameSnapshot,
      signerRoleSnapshot:
        row.signerRoleSnapshot as AlimentacionFormatoEmissionRecord["signerRoleSnapshot"],
      signatureVersionIdSnapshot: row.signatureVersionIdSnapshot,
      tenantLogoVersionIdSnapshot: row.tenantLogoVersionIdSnapshot,
      filename: row.filename,
      pdfRelativePath: row.pdfRelativePath,
      sourceRecordCount: row.sourceRecordCount,
      sourceDateFrom: row.sourceDateFrom,
      sourceDateTo: row.sourceDateTo,
      issuedByUserId: row.issuedByUserId,
      issuedAt: row.issuedAt,
    };
  }

  private toImportedFormatoVersionRecord(
    row: AlimentacionImportedFormatoVersionRow,
  ): AlimentacionImportedFormatoVersionRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      adultoMayorId: row.adultoMayorId,
      deliveryMonth: row.deliveryMonth,
      version: row.version,
      source: "importado",
      originalName: row.originalName,
      storedName: row.storedName,
      pdfRelativePath: row.pdfRelativePath,
      mimeType: "application/pdf",
      sizeBytes: row.sizeBytes,
      importedByUserId: row.importedByUserId,
      importedByUserFullName: row.importedByUserFullName,
      importedAt: row.importedAt,
    };
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function resolveMonthRange(deliveryMonth: string): {
  startDate: string;
  endDateExclusive: string;
} {
  const [yearValue, monthValue] = deliveryMonth.split("-");

  if (yearValue === undefined || monthValue === undefined) {
    throw new Error("deliveryMonth invalido.");
  }

  const year = Number.parseInt(yearValue, 10);
  const month = Number.parseInt(monthValue, 10);
  const nextYear = month === 12 ? year + 1 : year;
  const nextMonth = month === 12 ? 1 : month + 1;

  return {
    startDate: `${yearValue}-${monthValue}-01`,
    endDateExclusive: `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}
