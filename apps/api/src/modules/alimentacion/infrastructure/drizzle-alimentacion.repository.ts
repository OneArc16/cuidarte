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
  alimentacionRegistros,
  auditLogs,
  tenants,
} from "../../../database/schema";
import {
  type AlimentacionAdultoOptionRecord,
  type AlimentacionFormatoEmissionRecord,
  type AlimentacionFormatoEntregaRecord,
  type AlimentacionRecord,
  type AlimentacionTenantOptionRecord,
  type CreateAlimentacionFormatoEmissionCommand,
  type CreateAlimentacionFormatoEntregaExportAuditCommand,
  type CreateAlimentacionBatchRecordCommand,
  type FindAlimentacionAdultoMayorByIdQuery,
  type FindLatestAlimentacionFormatoEmissionQuery,
  type FindAlimentacionFormatoEntregaByAdultoAndMonthQuery,
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

    return rows.map((row) => this.toRecord(row));
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
      .limit(12);

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
      .where(
        and(
          eq(adultosMayores.tenantId, tenantId),
          inArray(adultosMayores.id, adultoMayorIds),
        ),
      )
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
    };
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
      signerRoleSnapshot: row.signerRoleSnapshot as AlimentacionFormatoEmissionRecord["signerRoleSnapshot"],
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
