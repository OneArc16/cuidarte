import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";

import { DatabaseService, type AppDatabase } from "../../../database/database.service";
import {
  adultosMayores,
  atencionesEnfermeria,
  auditLogs,
  epsCatalog,
  tenants,
  users,
} from "../../../database/schema";
import {
  type AtencionEnfermeriaAdultoRecord,
  type AtencionEnfermeriaDetailRecord,
  type AtencionEnfermeriaHistoryItemRecord,
  type AtencionEnfermeriaListItemRecord,
  type AtencionEnfermeriaMutableCommand,
  type AtencionEnfermeriaScope,
  type CreateAtencionEnfermeriaRecordCommand,
  type FindAtencionEnfermeriaByIdQuery,
  type FindAtencionEnfermeriaHistoryByAdultoMayorQuery,
  type FindAtencionEnfermeriaListQuery,
  type UpdateAtencionEnfermeriaRecordCommand,
} from "../domain/atencion-enfermeria.types";
import {
  AtencionEnfermeriaNotFoundError,
  AtencionEnfermeriaPermissionDeniedError,
  AtencionEnfermeriaVersionConflictError,
  type AtencionesEnfermeriaRepository,
} from "../domain/atenciones-enfermeria.repository";

type EnfermeriaDb = Pick<AppDatabase, "select" | "insert" | "update">;

type AtencionEnfermeriaRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  adultoDocumentNumber: string;
  adultoNames: string;
  adultoSurnames: string;
  adultoBirthDate: string;
  adultoSex: string;
  adultoStatus: AtencionEnfermeriaAdultoRecord["status"];
  adultoDeathDate: string | null;
  adultoEps: string | null;
  adultoHealthRegime: string | null;
  attentionDate: string;
  attentionTime: string;
  careType: AtencionEnfermeriaListItemRecord["careType"];
  reason: string | null;
  tensionSistolica: number | null;
  tensionDiastolica: number | null;
  frecuenciaCardiaca: number | null;
  frecuenciaRespiratoria: number | null;
  temperatura: number | null;
  saturacionOxigeno: number | null;
  pesoKg: number | null;
  tallaCm: number | null;
  imc: number | null;
  perimetroAbdominalCm: number | null;
  glucometriaMgDl: number | null;
  glucometriaContext: AtencionEnfermeriaListItemRecord["glucometriaContext"];
  nursingNote?: string;
  createdByUserId: string;
  updatedByUserId: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  deletedByUserId: string | null;
  professionalUserId: string;
  professionalFullName: string;
  professionalRole: AtencionEnfermeriaListItemRecord["professional"]["role"];
};

const MUTABLE_FIELD_NAMES: ReadonlyArray<keyof AtencionEnfermeriaMutableCommand> = [
  "attentionDate",
  "attentionTime",
  "careType",
  "reason",
  "tensionSistolica",
  "tensionDiastolica",
  "frecuenciaCardiaca",
  "frecuenciaRespiratoria",
  "temperatura",
  "saturacionOxigeno",
  "pesoKg",
  "tallaCm",
  "perimetroAbdominalCm",
  "glucometriaMgDl",
  "glucometriaContext",
  "nursingNote",
];

@Injectable()
export class DrizzleAtencionesEnfermeriaRepository implements AtencionesEnfermeriaRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAdultoMayorById(query: {
    adultoMayorId: string;
    scope: AtencionEnfermeriaScope;
  }): Promise<AtencionEnfermeriaAdultoRecord | null> {
    const conditions: SQL[] = [
      eq(adultosMayores.id, query.adultoMayorId),
      isNull(adultosMayores.deletedAt),
    ];

    if (query.scope.type === "tenant") {
      conditions.push(eq(adultosMayores.tenantId, query.scope.tenantId));
    }

    const [row] = await this.database.db
      .select(this.getAdultoSelection())
      .from(adultosMayores)
      .innerJoin(tenants, eq(tenants.id, adultosMayores.tenantId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : this.toAdultoRecord(row);
  }

  async findMany(
    query: FindAtencionEnfermeriaListQuery,
  ): Promise<AtencionEnfermeriaListItemRecord[]> {
    const rows = await this.selectMany(this.database.db, query, false);
    return rows.map((row: AtencionEnfermeriaRow) => this.toListItem(row));
  }

  async findTrashByAdultoMayor(query: FindAtencionEnfermeriaHistoryByAdultoMayorQuery) {
    const rows = await this.selectMany(
      this.database.db,
      { scope: query.scope, adultoMayorId: query.adultoMayorId },
      false,
      true,
      true,
    );
    return rows.map((row: AtencionEnfermeriaRow) => this.toListItem(row));
  }

  async softDelete(command: { id: string; actorUserId: string; tenantId: string }): Promise<void> {
    const now = new Date();
    await this.database.db.transaction(async (tx) => {
      const result = await tx
        .update(atencionesEnfermeria)
        .set({
          deletedAt: now,
          deletedByUserId: command.actorUserId,
          updatedAt: now,
        })
        .where(
          and(
            eq(atencionesEnfermeria.id, command.id),
            eq(atencionesEnfermeria.tenantId, command.tenantId),
            isNull(atencionesEnfermeria.deletedAt),
          ),
        )
        .returning({ id: atencionesEnfermeria.id });
      if (result.length === 0) throw new AtencionEnfermeriaNotFoundError();
      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        targetTenantId: command.tenantId,
        action: "atenciones-enfermeria.deleted",
        summary: "Atencion enviada a papelera.",
        metadata: { atencionId: command.id },
      });
    });
  }

  async restore(command: { id: string; actorUserId: string; tenantId: string }): Promise<void> {
    const now = new Date();
    await this.database.db.transaction(async (tx) => {
      const result = await tx
        .update(atencionesEnfermeria)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          updatedByUserId: command.actorUserId,
          updatedAt: now,
        })
        .where(
          and(
            eq(atencionesEnfermeria.id, command.id),
            eq(atencionesEnfermeria.tenantId, command.tenantId),
            isNotNull(atencionesEnfermeria.deletedAt),
          ),
        )
        .returning({ id: atencionesEnfermeria.id });
      if (result.length === 0) throw new AtencionEnfermeriaNotFoundError();
      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        targetTenantId: command.tenantId,
        action: "atenciones-enfermeria.restored",
        summary: "Atencion restaurada.",
        metadata: { atencionId: command.id },
      });
    });
  }

  async findById(
    query: FindAtencionEnfermeriaByIdQuery,
  ): Promise<AtencionEnfermeriaDetailRecord | null> {
    const [row] = await this.selectRows(
      this.database.db,
      query.scope,
      [eq(atencionesEnfermeria.id, query.id)],
      {
        includeNote: true,
        orderByAdultFields: false,
      },
      query.includeDeleted ?? false,
    ).limit(1);

    return row === undefined ? null : this.toDetail(row);
  }

  async findHistoryByAdultoMayor(
    query: FindAtencionEnfermeriaHistoryByAdultoMayorQuery,
  ): Promise<AtencionEnfermeriaHistoryItemRecord[]> {
    const rows = await this.selectMany(
      this.database.db,
      {
        scope: query.scope,
        adultoMayorId: query.adultoMayorId,
        professionalUserId: query.createdByUserId ?? null,
      },
      false,
    );

    return rows.map((row: AtencionEnfermeriaRow) => this.toListItem(row));
  }

  async findAdultoMayorScopeById(query: {
    adultoMayorId: string;
    scope: AtencionEnfermeriaScope;
  }): Promise<{ id: string; tenantId: string } | null> {
    const conditions: SQL[] = [
      eq(adultosMayores.id, query.adultoMayorId),
      isNull(adultosMayores.deletedAt),
    ];

    if (query.scope.type === "tenant") {
      conditions.push(eq(adultosMayores.tenantId, query.scope.tenantId));
    }

    const [row] = await this.database.db
      .select({
        id: adultosMayores.id,
        tenantId: adultosMayores.tenantId,
      })
      .from(adultosMayores)
      .where(and(...conditions))
      .limit(1);

    return row === undefined ? null : row;
  }

  async create(
    command: CreateAtencionEnfermeriaRecordCommand,
  ): Promise<AtencionEnfermeriaDetailRecord> {
    return await this.database.db.transaction(async (tx) => {
      await this.ensureAdultoMayorExists(tx, command.tenantId, command.adultoMayorId);
      await this.ensureAuthorIsTenantNurse(tx, command.tenantId, command.actorUserId);

      const now = new Date();
      const imc = this.computeImc(command.pesoKg, command.tallaCm);

      const [created] = await tx
        .insert(atencionesEnfermeria)
        .values({
          id: command.id,
          tenantId: command.tenantId,
          adultoMayorId: command.adultoMayorId,
          attentionDate: command.attentionDate,
          attentionTime: command.attentionTime,
          careType: command.careType,
          reason: command.reason,
          tensionSistolica: command.tensionSistolica,
          tensionDiastolica: command.tensionDiastolica,
          frecuenciaCardiaca: command.frecuenciaCardiaca,
          frecuenciaRespiratoria: command.frecuenciaRespiratoria,
          temperatura: command.temperatura,
          saturacionOxigeno: command.saturacionOxigeno,
          pesoKg: command.pesoKg,
          tallaCm: command.tallaCm,
          imc,
          perimetroAbdominalCm: command.perimetroAbdominalCm,
          glucometriaMgDl: command.glucometriaMgDl,
          glucometriaContext: command.glucometriaContext,
          nursingNote: command.nursingNote,
          createdByUserId: command.actorUserId,
          updatedByUserId: command.actorUserId,
          version: 1,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: atencionesEnfermeria.id });

      if (created === undefined) {
        throw new Error("No fue posible guardar la atencion de enfermeria.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "atenciones-enfermeria.created",
        targetTenantId: command.tenantId,
        summary: `Atencion de enfermeria creada para ${command.adultoMayorId}.`,
        metadata: {
          atencionId: command.id,
          adultoMayorId: command.adultoMayorId,
          version: 1,
          changedFields: [...MUTABLE_FIELD_NAMES],
          imc,
        },
      });

      const record = await this.findByIdWithinTx(tx, {
        id: command.id,
        scope: { type: "tenant", tenantId: command.tenantId },
      });

      if (record === null) {
        throw new Error("No fue posible consultar la atencion de enfermeria creada.");
      }

      return record;
    });
  }

  async update(
    command: UpdateAtencionEnfermeriaRecordCommand,
  ): Promise<AtencionEnfermeriaDetailRecord> {
    return await this.database.db.transaction(async (tx) => {
      const currentRecord = await this.findByIdWithinTx(tx, {
        id: command.id,
        scope: { type: "tenant", tenantId: command.tenantId },
      });

      if (currentRecord === null) {
        throw new AtencionEnfermeriaNotFoundError();
      }

      if (currentRecord.createdByUserId !== command.actorUserId) {
        throw new AtencionEnfermeriaPermissionDeniedError(
          "Solo puedes editar las atenciones de enfermeria creadas por ti.",
        );
      }

      const nextImc = this.computeImc(command.pesoKg, command.tallaCm);
      const now = new Date();
      const updateResult = await tx
        .update(atencionesEnfermeria)
        .set({
          attentionDate: command.attentionDate,
          attentionTime: command.attentionTime,
          careType: command.careType,
          reason: command.reason,
          tensionSistolica: command.tensionSistolica,
          tensionDiastolica: command.tensionDiastolica,
          frecuenciaCardiaca: command.frecuenciaCardiaca,
          frecuenciaRespiratoria: command.frecuenciaRespiratoria,
          temperatura: command.temperatura,
          saturacionOxigeno: command.saturacionOxigeno,
          pesoKg: command.pesoKg,
          tallaCm: command.tallaCm,
          imc: nextImc,
          perimetroAbdominalCm: command.perimetroAbdominalCm,
          glucometriaMgDl: command.glucometriaMgDl,
          glucometriaContext: command.glucometriaContext,
          nursingNote: command.nursingNote,
          updatedByUserId: command.actorUserId,
          updatedAt: now,
          version: command.version + 1,
        })
        .where(
          and(
            eq(atencionesEnfermeria.id, command.id),
            eq(atencionesEnfermeria.tenantId, command.tenantId),
            eq(atencionesEnfermeria.version, command.version),
          ),
        )
        .returning({ id: atencionesEnfermeria.id });

      if (updateResult[0] === undefined) {
        throw new AtencionEnfermeriaVersionConflictError();
      }

      const changedFields = this.collectChangedFields(currentRecord, command, nextImc);

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "atenciones-enfermeria.updated",
        targetTenantId: command.tenantId,
        summary: `Atencion de enfermeria actualizada para ${currentRecord.adultoMayorId}.`,
        metadata: {
          atencionId: command.id,
          adultoMayorId: currentRecord.adultoMayorId,
          versionBefore: currentRecord.version,
          versionAfter: command.version + 1,
          changedFields,
          imc: nextImc,
        },
      });

      const updatedRecord = await this.findByIdWithinTx(tx, {
        id: command.id,
        scope: { type: "tenant", tenantId: command.tenantId },
      });

      if (updatedRecord === null) {
        throw new Error("No fue posible consultar la atencion de enfermeria actualizada.");
      }

      return updatedRecord;
    });
  }

  private async selectMany(
    db: EnfermeriaDb,
    query: FindAtencionEnfermeriaListQuery,
    includeNote: boolean,
    includeDeleted = false,
    onlyDeleted = false,
  ) {
    const options: {
      includeNote: boolean;
      orderByAdultFields: boolean;
      limit?: number;
      offset?: number;
    } = {
      includeNote,
      orderByAdultFields: true,
    };

    if (query.limit !== undefined) {
      options.limit = query.limit;
    }

    if (query.offset !== undefined) {
      options.offset = query.offset;
    }

    const conditions = this.buildListConditions(query);
    if (onlyDeleted) {
      conditions.push(isNotNull(atencionesEnfermeria.deletedAt));
    }
    return await this.selectRows(db, query.scope, conditions, options, includeDeleted);
  }

  private buildListConditions(query: FindAtencionEnfermeriaListQuery): SQL[] {
    const conditions: SQL[] = [];

    if (query.scope.type === "tenant") {
      conditions.push(eq(atencionesEnfermeria.tenantId, query.scope.tenantId));
    }

    if (query.tenantId !== undefined && query.tenantId !== null) {
      conditions.push(eq(atencionesEnfermeria.tenantId, query.tenantId));
    }

    if (query.adultoMayorId !== undefined && query.adultoMayorId !== null) {
      conditions.push(eq(atencionesEnfermeria.adultoMayorId, query.adultoMayorId));
    }

    if (query.documentNumber !== undefined && query.documentNumber !== null) {
      conditions.push(eq(adultosMayores.documentNumber, query.documentNumber));
    }

    if (query.professionalUserId !== undefined && query.professionalUserId !== null) {
      conditions.push(eq(atencionesEnfermeria.createdByUserId, query.professionalUserId));
    }

    if (query.attentionDate !== undefined && query.attentionDate !== null) {
      conditions.push(eq(atencionesEnfermeria.attentionDate, query.attentionDate));
    }

    if (query.search !== undefined && query.search !== null) {
      const normalizedSearch = query.search.trim();

      if (normalizedSearch !== "") {
        const pattern = `%${escapeLikePattern(normalizedSearch)}%`;

        conditions.push(
          or(
            ilike(adultosMayores.documentNumber, pattern),
            ilike(adultosMayores.names, pattern),
            ilike(adultosMayores.surnames, pattern),
            ilike(users.fullName, pattern),
            ilike(atencionesEnfermeria.reason, pattern),
          )!,
        );
      }
    }

    return conditions;
  }

  private selectRows(
    db: EnfermeriaDb,
    scope: AtencionEnfermeriaScope,
    extraConditions: SQL[],
    options: {
      includeNote: boolean;
      orderByAdultFields: boolean;
      limit?: number;
      offset?: number;
    },
    includeDeleted = false,
  ): any {
    const selection = options.includeNote ? this.getDetailSelection() : this.getListSelection();
    let query: any = db
      .select(selection)
      .from(atencionesEnfermeria)
      .innerJoin(adultosMayores, eq(adultosMayores.id, atencionesEnfermeria.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, atencionesEnfermeria.tenantId))
      .innerJoin(users, eq(users.id, atencionesEnfermeria.createdByUserId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(this.buildScopedWhere(scope, extraConditions, includeDeleted));

    query = query.orderBy(
      desc(atencionesEnfermeria.attentionDate),
      desc(atencionesEnfermeria.attentionTime),
      desc(atencionesEnfermeria.updatedAt),
      ...(options.orderByAdultFields
        ? [asc(adultosMayores.surnames), asc(adultosMayores.names)]
        : []),
    );

    if (options.limit !== undefined) {
      query = query.limit(options.limit);
    }

    if (options.offset !== undefined) {
      query = query.offset(options.offset);
    }

    return query;
  }

  private buildScopedWhere(scope: AtencionEnfermeriaScope, extra: SQL[], includeDeleted = false) {
    const conditions = [...extra, isNull(adultosMayores.deletedAt)];

    if (!includeDeleted) {
      conditions.push(isNull(atencionesEnfermeria.deletedAt));
    }

    if (scope.type === "tenant") {
      conditions.push(eq(atencionesEnfermeria.tenantId, scope.tenantId));
    }

    return and(...conditions);
  }

  private getListSelection() {
    return {
      id: atencionesEnfermeria.id,
      tenantId: atencionesEnfermeria.tenantId,
      tenantName: tenants.name,
      adultoMayorId: atencionesEnfermeria.adultoMayorId,
      adultoDocumentNumber: adultosMayores.documentNumber,
      adultoNames: adultosMayores.names,
      adultoSurnames: adultosMayores.surnames,
      adultoBirthDate: adultosMayores.birthDate,
      adultoSex: adultosMayores.sex,
      adultoStatus: adultosMayores.status,
      adultoDeathDate: adultosMayores.deathDate,
      adultoEps: sql<string | null>`coalesce(${epsCatalog.name}, ${adultosMayores.eps})`,
      adultoHealthRegime: adultosMayores.healthRegime,
      attentionDate: atencionesEnfermeria.attentionDate,
      attentionTime: atencionesEnfermeria.attentionTime,
      careType: atencionesEnfermeria.careType,
      reason: atencionesEnfermeria.reason,
      tensionSistolica: atencionesEnfermeria.tensionSistolica,
      tensionDiastolica: atencionesEnfermeria.tensionDiastolica,
      frecuenciaCardiaca: atencionesEnfermeria.frecuenciaCardiaca,
      frecuenciaRespiratoria: atencionesEnfermeria.frecuenciaRespiratoria,
      temperatura: atencionesEnfermeria.temperatura,
      saturacionOxigeno: atencionesEnfermeria.saturacionOxigeno,
      pesoKg: atencionesEnfermeria.pesoKg,
      tallaCm: atencionesEnfermeria.tallaCm,
      imc: atencionesEnfermeria.imc,
      perimetroAbdominalCm: atencionesEnfermeria.perimetroAbdominalCm,
      glucometriaMgDl: atencionesEnfermeria.glucometriaMgDl,
      glucometriaContext: atencionesEnfermeria.glucometriaContext,
      createdByUserId: atencionesEnfermeria.createdByUserId,
      updatedByUserId: atencionesEnfermeria.updatedByUserId,
      version: atencionesEnfermeria.version,
      createdAt: atencionesEnfermeria.createdAt,
      updatedAt: atencionesEnfermeria.updatedAt,
      deletedAt: atencionesEnfermeria.deletedAt,
      deletedByUserId: atencionesEnfermeria.deletedByUserId,
      professionalUserId: users.id,
      professionalFullName: users.fullName,
      professionalRole: users.role,
    };
  }

  private getAdultoSelection() {
    return {
      id: adultosMayores.id,
      tenantId: adultosMayores.tenantId,
      tenantName: tenants.name,
      documentNumber: adultosMayores.documentNumber,
      names: adultosMayores.names,
      surnames: adultosMayores.surnames,
      birthDate: adultosMayores.birthDate,
      sex: adultosMayores.sex,
      status: adultosMayores.status,
      deathDate: adultosMayores.deathDate,
      eps: sql<string | null>`coalesce(${epsCatalog.name}, ${adultosMayores.eps})`,
      healthRegime: adultosMayores.healthRegime,
    };
  }

  private getDetailSelection() {
    return {
      ...this.getListSelection(),
      nursingNote: atencionesEnfermeria.nursingNote,
    };
  }

  private toListItem(row: AtencionEnfermeriaRow): AtencionEnfermeriaListItemRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      adultoMayorId: row.adultoMayorId,
      adultoMayor: this.toAdultoResumen(row),
      attentionDate: row.attentionDate,
      attentionTime: normalizeTimeValue(row.attentionTime),
      careType: row.careType,
      reason: row.reason,
      tensionSistolica: row.tensionSistolica,
      tensionDiastolica: row.tensionDiastolica,
      frecuenciaCardiaca: row.frecuenciaCardiaca,
      frecuenciaRespiratoria: row.frecuenciaRespiratoria,
      temperatura: row.temperatura,
      saturacionOxigeno: row.saturacionOxigeno,
      pesoKg: row.pesoKg,
      tallaCm: row.tallaCm,
      imc: row.imc,
      perimetroAbdominalCm: row.perimetroAbdominalCm,
      glucometriaMgDl: row.glucometriaMgDl,
      glucometriaContext: row.glucometriaContext,
      professional: {
        userId: row.professionalUserId,
        fullName: row.professionalFullName,
        role: row.professionalRole,
      },
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      deletedByUserId: row.deletedByUserId,
    };
  }

  private toDetail(row: AtencionEnfermeriaRow): AtencionEnfermeriaDetailRecord {
    return {
      ...this.toListItem(row),
      nursingNote: row.nursingNote ?? "",
    };
  }

  private toAdultoResumen(row: AtencionEnfermeriaRow): AtencionEnfermeriaAdultoRecord {
    return {
      id: row.adultoMayorId,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      documentNumber: row.adultoDocumentNumber,
      fullName: `${row.adultoNames} ${row.adultoSurnames}`.trim(),
      birthDate: row.adultoBirthDate,
      sex: row.adultoSex,
      eps: row.adultoEps,
      healthRegime: row.adultoHealthRegime,
      ...(row.adultoStatus === undefined ? {} : { status: row.adultoStatus }),
      deathDate: row.adultoDeathDate,
    };
  }

  private toAdultoRecord(row: {
    id: string;
    tenantId: string;
    tenantName: string;
    documentNumber: string;
    names: string;
    surnames: string;
    birthDate: string;
    sex: string;
    status: AtencionEnfermeriaAdultoRecord["status"];
    deathDate: string | null;
    eps: string | null;
    healthRegime: string | null;
  }): AtencionEnfermeriaAdultoRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
      birthDate: row.birthDate,
      sex: row.sex,
      ...(row.status === undefined ? {} : { status: row.status }),
      deathDate: row.deathDate,
      eps: row.eps,
      healthRegime: row.healthRegime,
    };
  }

  private async findByIdWithinTx(
    tx: EnfermeriaDb,
    query: FindAtencionEnfermeriaByIdQuery,
  ): Promise<AtencionEnfermeriaDetailRecord | null> {
    const [row] = await this.selectRows(
      tx,
      query.scope,
      [eq(atencionesEnfermeria.id, query.id)],
      {
        includeNote: true,
        orderByAdultFields: false,
        limit: 1,
      },
      query.includeDeleted ?? false,
    );

    return row === undefined ? null : this.toDetail(row);
  }

  private async ensureAdultoMayorExists(
    tx: EnfermeriaDb,
    tenantId: string,
    adultoMayorId: string,
  ): Promise<void> {
    const [row] = await tx
      .select({
        id: adultosMayores.id,
      })
      .from(adultosMayores)
      .where(and(eq(adultosMayores.id, adultoMayorId), eq(adultosMayores.tenantId, tenantId)))
      .limit(1);

    if (row === undefined) {
      throw new AtencionEnfermeriaNotFoundError("El adulto mayor no pertenece al tenant.");
    }
  }

  private async ensureAuthorIsTenantNurse(
    tx: EnfermeriaDb,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    const [row] = await tx
      .select({
        id: users.id,
        tenantId: users.tenantId,
        role: users.role,
        isActive: users.isActive,
      })
      .from(users)
      .where(and(eq(users.id, userId), eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .limit(1);

    if (row === undefined || row.role !== "enfermeria") {
      throw new AtencionEnfermeriaPermissionDeniedError(
        "Solo una enfermera activa del tenant puede crear atenciones de enfermeria.",
      );
    }
  }

  private computeImc(pesoKg: number | null, tallaCm: number | null): number | null {
    if (pesoKg === null || tallaCm === null || tallaCm <= 0) {
      return null;
    }

    const imc = pesoKg / Math.pow(tallaCm / 100, 2);
    return Number(imc.toFixed(1));
  }

  private collectChangedFields(
    currentRecord: AtencionEnfermeriaDetailRecord,
    command: UpdateAtencionEnfermeriaRecordCommand,
    nextImc: number | null,
  ): string[] {
    const nextValues: Record<keyof AtencionEnfermeriaMutableCommand | "imc", unknown> = {
      attentionDate: command.attentionDate,
      attentionTime: command.attentionTime,
      careType: command.careType,
      reason: command.reason,
      tensionSistolica: command.tensionSistolica,
      tensionDiastolica: command.tensionDiastolica,
      frecuenciaCardiaca: command.frecuenciaCardiaca,
      frecuenciaRespiratoria: command.frecuenciaRespiratoria,
      temperatura: command.temperatura,
      saturacionOxigeno: command.saturacionOxigeno,
      pesoKg: command.pesoKg,
      tallaCm: command.tallaCm,
      perimetroAbdominalCm: command.perimetroAbdominalCm,
      glucometriaMgDl: command.glucometriaMgDl,
      glucometriaContext: command.glucometriaContext,
      nursingNote: command.nursingNote,
      imc: nextImc,
    };

    const currentValues: Record<string, unknown> = {
      attentionDate: currentRecord.attentionDate,
      attentionTime: currentRecord.attentionTime,
      careType: currentRecord.careType,
      reason: currentRecord.reason,
      tensionSistolica: currentRecord.tensionSistolica,
      tensionDiastolica: currentRecord.tensionDiastolica,
      frecuenciaCardiaca: currentRecord.frecuenciaCardiaca,
      frecuenciaRespiratoria: currentRecord.frecuenciaRespiratoria,
      temperatura: currentRecord.temperatura,
      saturacionOxigeno: currentRecord.saturacionOxigeno,
      pesoKg: currentRecord.pesoKg,
      tallaCm: currentRecord.tallaCm,
      perimetroAbdominalCm: currentRecord.perimetroAbdominalCm,
      glucometriaMgDl: currentRecord.glucometriaMgDl,
      glucometriaContext: currentRecord.glucometriaContext,
      nursingNote: currentRecord.nursingNote,
      imc: currentRecord.imc,
    };

    return MUTABLE_FIELD_NAMES.filter((field) => currentValues[field] !== nextValues[field]);
  }
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function normalizeTimeValue(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}
