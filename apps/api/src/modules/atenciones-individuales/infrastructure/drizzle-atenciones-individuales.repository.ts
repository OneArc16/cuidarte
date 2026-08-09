import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, inArray, ne, sql, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  adultosMayores,
  atencionIndividualCounters,
  atencionIndividualSupportFiles,
  atencionesIndividuales,
  auditLogs,
  epsCatalog,
  tenants,
  users,
} from "../../../database/schema";
import {
  type AtencionIndividualAdultoRecord,
  type AtencionIndividualHistoryItemRecord,
  type AtencionIndividualRecord,
  type AtencionIndividualSupportFileRecord,
  type CreateAtencionIndividualRecordCommand,
  type FindAtencionIndividualAdultoByIdQuery,
  type FindAtencionIndividualByConsecutiveQuery,
  type FindAtencionIndividualHistoryByAdultoMayorQuery,
  type FindAtencionIndividualByIdQuery,
  type SavedAtencionIndividualRecord,
  type UpdateAtencionIndividualRecordCommand,
} from "../domain/atencion-individual.types";
import { type AtencionesIndividualesRepository } from "../domain/atenciones-individuales.repository";

type AtencionIndividualRow = Omit<
  AtencionIndividualRecord,
  | "adultoMayor"
  | "modalidad"
  | "tipoConsulta"
  | "finalidad"
  | "causaExterna"
  | "ordenesMedicas"
  | "diagnosticos"
  | "supportFiles"
> & {
  modalidad: string;
  tipoConsulta: string;
  finalidad: string;
  causaExterna: string;
  ordenesMedicas: Array<Record<string, unknown>>;
  diagnosticos: Array<Record<string, unknown>>;
  adultoDocumentNumber: string;
  adultoFullName: string;
  adultoBirthDate: string;
  adultoSex: string;
  adultoEps: string | null;
  adultoHealthRegime: string | null;
};

type AtencionIndividualAdultoRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentNumber: string;
  names: string;
  surnames: string;
  birthDate: string;
  sex: string;
  eps: string | null;
  healthRegime: string | null;
};

type AtencionIndividualHistoryRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  attentionDate: string;
  modalidad: string;
  tipoConsulta: string;
  nombreConsulta: string;
  consecutive: number;
  createdByUserId: string;
  createdByUserFullName: string;
  createdByUserRole: AtencionIndividualHistoryItemRecord["createdByUserRole"];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DrizzleAtencionesIndividualesRepository implements AtencionesIndividualesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findAdultoMayorById(
    query: FindAtencionIndividualAdultoByIdQuery,
  ): Promise<AtencionIndividualAdultoRecord | null> {
    const conditions: SQL[] = [eq(adultosMayores.id, query.adultoMayorId)];

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

  async findHistoryByAdultoMayor(
    query: FindAtencionIndividualHistoryByAdultoMayorQuery,
  ): Promise<AtencionIndividualHistoryItemRecord[]> {
    const conditions: SQL[] = [eq(atencionesIndividuales.adultoMayorId, query.adultoMayorId)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(atencionesIndividuales.tenantId, query.scope.tenantId));
    }

    if (query.createdByUserId !== undefined) {
      conditions.push(eq(atencionesIndividuales.createdByUserId, query.createdByUserId));
    }

    const rows = await this.database.db
      .select(this.getHistorySelection())
      .from(atencionesIndividuales)
      .innerJoin(tenants, eq(tenants.id, atencionesIndividuales.tenantId))
      .innerJoin(users, eq(users.id, atencionesIndividuales.createdByUserId))
      .where(and(...conditions))
      .orderBy(
        desc(atencionesIndividuales.attentionDate),
        desc(atencionesIndividuales.consecutive),
        asc(users.fullName),
      );

    return rows.map((row) => this.toHistoryRecord(row));
  }

  async findById(query: FindAtencionIndividualByIdQuery): Promise<AtencionIndividualRecord | null> {
    const conditions: SQL[] = [eq(atencionesIndividuales.id, query.id)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(atencionesIndividuales.tenantId, query.scope.tenantId));
    }

    const [row] = await this.database.db
      .select(this.getAtencionSelection())
      .from(atencionesIndividuales)
      .innerJoin(adultosMayores, eq(adultosMayores.id, atencionesIndividuales.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, atencionesIndividuales.tenantId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined
      ? null
      : this.toAtencionRecord(row, await this.findSupportFilesByAtencionId(row.id));
  }

  async findByConsecutive(
    query: FindAtencionIndividualByConsecutiveQuery,
  ): Promise<AtencionIndividualRecord | null> {
    const conditions: SQL[] = [
      eq(atencionesIndividuales.tenantId, query.tenantId),
      eq(atencionesIndividuales.consecutive, query.consecutive),
    ];

    if (query.excludeId !== undefined) {
      conditions.push(ne(atencionesIndividuales.id, query.excludeId));
    }

    const [row] = await this.database.db
      .select(this.getAtencionSelection())
      .from(atencionesIndividuales)
      .innerJoin(adultosMayores, eq(adultosMayores.id, atencionesIndividuales.adultoMayorId))
      .innerJoin(tenants, eq(tenants.id, atencionesIndividuales.tenantId))
      .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
      .where(and(...conditions))
      .limit(1);

    return row === undefined
      ? null
      : this.toAtencionRecord(row, await this.findSupportFilesByAtencionId(row.id));
  }

  async peekNextConsecutive(tenantId: string): Promise<number> {
    const [row] = await this.database.db
      .select({ lastValue: atencionIndividualCounters.lastValue })
      .from(atencionIndividualCounters)
      .where(eq(atencionIndividualCounters.tenantId, tenantId))
      .limit(1);

    return (row?.lastValue ?? 0) + 1;
  }

  async create(command: CreateAtencionIndividualRecordCommand): Promise<AtencionIndividualRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      await tx
        .insert(atencionIndividualCounters)
        .values({
          tenantId: command.tenantId,
          lastValue: command.consecutive,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: atencionIndividualCounters.tenantId,
          set: {
            lastValue: sql`greatest(${atencionIndividualCounters.lastValue}, ${command.consecutive})`,
            updatedAt: now,
          },
        });

      const [created] = await tx
        .insert(atencionesIndividuales)
        .values({
          ...this.toMutableValues(command),
          id: command.id,
          tenantId: command.tenantId,
          adultoMayorId: command.adultoMayorId,
          createdByUserId: command.actorUserId,
          updatedByUserId: command.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: atencionesIndividuales.id });

      if (created === undefined) {
        throw new Error("No fue posible crear la atencion individual.");
      }

      if (command.supportFiles.length > 0) {
        await tx.insert(atencionIndividualSupportFiles).values(
          command.supportFiles.map((file) => ({
            atencionId: created.id,
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            relativePath: file.relativePath,
            createdByUserId: command.actorUserId,
            createdAt: now,
          })),
        );
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "atenciones-individuales.created",
        targetTenantId: command.tenantId,
        summary: `Atencion individual creada: consecutivo ${command.consecutive}`,
        metadata: {
          adultoMayorId: command.adultoMayorId,
          attentionDate: command.attentionDate,
          consecutive: command.consecutive,
        },
      });

      if (command.supportFiles.length > 0) {
        await tx.insert(auditLogs).values({
          actorUserId: command.actorUserId,
          action: "atenciones-individuales.support-files-uploaded",
          targetTenantId: command.tenantId,
          summary: `${command.supportFiles.length} soporte(s) PDF cargado(s) para la atencion.`,
          metadata: {
            atencionId: created.id,
            fileCount: command.supportFiles.length,
            fileIds: command.supportFiles.map((file) => file.storedName),
          },
        });
      }

      const [row] = await tx
        .select(this.getAtencionSelection())
        .from(atencionesIndividuales)
        .innerJoin(adultosMayores, eq(adultosMayores.id, atencionesIndividuales.adultoMayorId))
        .innerJoin(tenants, eq(tenants.id, atencionesIndividuales.tenantId))
        .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
        .where(eq(atencionesIndividuales.id, created.id))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar la atencion individual creada.");
      }

      const supportFiles = await tx
        .select(this.getSupportFileSelection())
        .from(atencionIndividualSupportFiles)
        .where(eq(atencionIndividualSupportFiles.atencionId, created.id));

      return this.toAtencionRecord(row, supportFiles);
    });
  }

  async update(
    command: UpdateAtencionIndividualRecordCommand,
  ): Promise<SavedAtencionIndividualRecord> {
    return await this.database.db.transaction(async (tx) => {
      const [beforeRow] = await tx
        .select(this.getAtencionSelection())
        .from(atencionesIndividuales)
        .innerJoin(adultosMayores, eq(adultosMayores.id, atencionesIndividuales.adultoMayorId))
        .innerJoin(tenants, eq(tenants.id, atencionesIndividuales.tenantId))
        .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
        .where(eq(atencionesIndividuales.id, command.id))
        .limit(1);

      if (beforeRow === undefined) {
        throw new Error("No fue posible consultar la atencion individual a actualizar.");
      }

      const removedFiles =
        command.removedSupportFileIds.length === 0
          ? []
          : await tx
              .select(this.getSupportFileSelection())
              .from(atencionIndividualSupportFiles)
              .where(
                and(
                  eq(atencionIndividualSupportFiles.atencionId, command.id),
                  inArray(atencionIndividualSupportFiles.id, command.removedSupportFileIds),
                ),
              );

      const now = new Date();
      await tx
        .insert(atencionIndividualCounters)
        .values({
          tenantId: beforeRow.tenantId,
          lastValue: command.consecutive,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: atencionIndividualCounters.tenantId,
          set: {
            lastValue: sql`greatest(${atencionIndividualCounters.lastValue}, ${command.consecutive})`,
            updatedAt: now,
          },
        });

      await tx
        .update(atencionesIndividuales)
        .set({
          ...this.toMutableValues(command),
          updatedByUserId: command.actorUserId,
          updatedAt: now,
        })
        .where(eq(atencionesIndividuales.id, command.id));

      if (command.removedSupportFileIds.length > 0) {
        await tx
          .delete(atencionIndividualSupportFiles)
          .where(
            and(
              eq(atencionIndividualSupportFiles.atencionId, command.id),
              inArray(atencionIndividualSupportFiles.id, command.removedSupportFileIds),
            ),
          );
      }

      if (command.supportFiles.length > 0) {
        await tx.insert(atencionIndividualSupportFiles).values(
          command.supportFiles.map((file) => ({
            atencionId: command.id,
            originalName: file.originalName,
            storedName: file.storedName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            checksum: file.checksum,
            relativePath: file.relativePath,
            createdByUserId: command.actorUserId,
            createdAt: now,
          })),
        );
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "atenciones-individuales.updated",
        targetTenantId: beforeRow.tenantId,
        summary: `Atencion individual actualizada: consecutivo ${command.consecutive}`,
        metadata: {
          before: {
            attentionDate: beforeRow.attentionDate,
            consecutive: beforeRow.consecutive,
            nombreConsulta: beforeRow.nombreConsulta,
          },
          after: {
            attentionDate: command.attentionDate,
            consecutive: command.consecutive,
            nombreConsulta: command.nombreConsulta,
          },
        },
      });

      if (command.supportFiles.length > 0) {
        await tx.insert(auditLogs).values({
          actorUserId: command.actorUserId,
          action: "atenciones-individuales.support-files-uploaded",
          targetTenantId: beforeRow.tenantId,
          summary: `${command.supportFiles.length} soporte(s) PDF cargado(s) para la atencion.`,
          metadata: {
            atencionId: command.id,
            fileCount: command.supportFiles.length,
            fileIds: command.supportFiles.map((file) => file.storedName),
          },
        });
      }

      const [afterRow] = await tx
        .select(this.getAtencionSelection())
        .from(atencionesIndividuales)
        .innerJoin(adultosMayores, eq(adultosMayores.id, atencionesIndividuales.adultoMayorId))
        .innerJoin(tenants, eq(tenants.id, atencionesIndividuales.tenantId))
        .leftJoin(epsCatalog, eq(epsCatalog.id, adultosMayores.epsId))
        .where(eq(atencionesIndividuales.id, command.id))
        .limit(1);

      if (afterRow === undefined) {
        throw new Error("No fue posible consultar la atencion individual actualizada.");
      }

      const supportFiles = await tx
        .select(this.getSupportFileSelection())
        .from(atencionIndividualSupportFiles)
        .where(eq(atencionIndividualSupportFiles.atencionId, command.id));

      return { record: this.toAtencionRecord(afterRow, supportFiles), removedFiles };
    });
  }

  async recordSupportFileDownload(command: {
    atencionId: string;
    tenantId: string;
    fileId: string;
    actorUserId: string;
  }): Promise<void> {
    await this.database.db.insert(auditLogs).values({
      actorUserId: command.actorUserId,
      action: "atenciones-individuales.support-file-downloaded",
      targetTenantId: command.tenantId,
      summary: "Soporte PDF descargado desde una atencion individual.",
      metadata: {
        atencionId: command.atencionId,
        fileId: command.fileId,
      },
    });
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
      eps: sql<string | null>`coalesce(${epsCatalog.name}, ${adultosMayores.eps})`,
      healthRegime: adultosMayores.healthRegime,
    };
  }

  private getAtencionSelection() {
    return {
      id: atencionesIndividuales.id,
      tenantId: atencionesIndividuales.tenantId,
      tenantName: tenants.name,
      adultoMayorId: atencionesIndividuales.adultoMayorId,
      attentionDate: atencionesIndividuales.attentionDate,
      modalidad: atencionesIndividuales.modalidad,
      tipoConsulta: atencionesIndividuales.tipoConsulta,
      nombreConsulta: atencionesIndividuales.nombreConsulta,
      consecutive: atencionesIndividuales.consecutive,
      finalidad: atencionesIndividuales.finalidad,
      causaExterna: atencionesIndividuales.causaExterna,
      motivoConsulta: atencionesIndividuales.motivoConsulta,
      enfermedadActual: atencionesIndividuales.enfermedadActual,
      antecedentesPersonales: atencionesIndividuales.antecedentesPersonales,
      antecedentesFamiliares: atencionesIndividuales.antecedentesFamiliares,
      tensionSistolica: atencionesIndividuales.tensionSistolica,
      tensionDiastolica: atencionesIndividuales.tensionDiastolica,
      frecuenciaCardiaca: atencionesIndividuales.frecuenciaCardiaca,
      frecuenciaRespiratoria: atencionesIndividuales.frecuenciaRespiratoria,
      temperatura: atencionesIndividuales.temperatura,
      saturacionOxigeno: atencionesIndividuales.saturacionOxigeno,
      pesoKg: atencionesIndividuales.pesoKg,
      tallaCm: atencionesIndividuales.tallaCm,
      imc: atencionesIndividuales.imc,
      perimetroAbdominalCm: atencionesIndividuales.perimetroAbdominalCm,
      examenFisico: atencionesIndividuales.examenFisico,
      resultadosLaboratorios: atencionesIndividuales.resultadosLaboratorios,
      resultadosProcedimientos: atencionesIndividuales.resultadosProcedimientos,
      ordenesMedicas: atencionesIndividuales.ordenesMedicas,
      diagnosticos: atencionesIndividuales.diagnosticos,
      createdByUserId: atencionesIndividuales.createdByUserId,
      updatedByUserId: atencionesIndividuales.updatedByUserId,
      createdAt: atencionesIndividuales.createdAt,
      updatedAt: atencionesIndividuales.updatedAt,
      adultoDocumentNumber: adultosMayores.documentNumber,
      adultoFullName: sql<string>`concat(${adultosMayores.names}, ' ', ${adultosMayores.surnames})`,
      adultoBirthDate: adultosMayores.birthDate,
      adultoSex: adultosMayores.sex,
      adultoEps: sql<string | null>`coalesce(${epsCatalog.name}, ${adultosMayores.eps})`,
      adultoHealthRegime: adultosMayores.healthRegime,
    };
  }

  private getSupportFileSelection() {
    return {
      id: atencionIndividualSupportFiles.id,
      atencionId: atencionIndividualSupportFiles.atencionId,
      originalName: atencionIndividualSupportFiles.originalName,
      storedName: atencionIndividualSupportFiles.storedName,
      mimeType: atencionIndividualSupportFiles.mimeType,
      sizeBytes: atencionIndividualSupportFiles.sizeBytes,
      checksum: atencionIndividualSupportFiles.checksum,
      relativePath: atencionIndividualSupportFiles.relativePath,
      createdAt: atencionIndividualSupportFiles.createdAt,
      updatedAt: atencionIndividualSupportFiles.updatedAt,
    };
  }

  private getHistorySelection() {
    return {
      id: atencionesIndividuales.id,
      tenantId: atencionesIndividuales.tenantId,
      tenantName: tenants.name,
      adultoMayorId: atencionesIndividuales.adultoMayorId,
      attentionDate: atencionesIndividuales.attentionDate,
      modalidad: atencionesIndividuales.modalidad,
      tipoConsulta: atencionesIndividuales.tipoConsulta,
      nombreConsulta: atencionesIndividuales.nombreConsulta,
      consecutive: atencionesIndividuales.consecutive,
      createdByUserId: atencionesIndividuales.createdByUserId,
      createdByUserFullName: users.fullName,
      createdByUserRole: users.role,
      createdAt: atencionesIndividuales.createdAt,
      updatedAt: atencionesIndividuales.updatedAt,
    };
  }

  private async findSupportFilesByAtencionId(
    atencionId: string,
  ): Promise<AtencionIndividualSupportFileRecord[]> {
    return await this.database.db
      .select(this.getSupportFileSelection())
      .from(atencionIndividualSupportFiles)
      .where(eq(atencionIndividualSupportFiles.atencionId, atencionId));
  }

  private toMutableValues(
    command: CreateAtencionIndividualRecordCommand | UpdateAtencionIndividualRecordCommand,
  ) {
    return {
      attentionDate: command.attentionDate,
      modalidad: command.modalidad,
      tipoConsulta: command.tipoConsulta,
      nombreConsulta: command.nombreConsulta,
      consecutive: command.consecutive,
      finalidad: command.finalidad,
      causaExterna: command.causaExterna,
      motivoConsulta: command.motivoConsulta,
      enfermedadActual: command.enfermedadActual,
      antecedentesPersonales: command.antecedentesPersonales,
      antecedentesFamiliares: command.antecedentesFamiliares,
      tensionSistolica: command.tensionSistolica,
      tensionDiastolica: command.tensionDiastolica,
      frecuenciaCardiaca: command.frecuenciaCardiaca,
      frecuenciaRespiratoria: command.frecuenciaRespiratoria,
      temperatura: command.temperatura,
      saturacionOxigeno: command.saturacionOxigeno,
      pesoKg: command.pesoKg,
      tallaCm: command.tallaCm,
      imc: command.imc,
      perimetroAbdominalCm: command.perimetroAbdominalCm,
      examenFisico: command.examenFisico,
      resultadosLaboratorios: command.resultadosLaboratorios,
      resultadosProcedimientos: command.resultadosProcedimientos,
      ordenesMedicas: command.ordenesMedicas,
      diagnosticos: command.diagnosticos,
    };
  }

  private toAdultoRecord(row: AtencionIndividualAdultoRow): AtencionIndividualAdultoRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`,
      birthDate: row.birthDate,
      sex: row.sex,
      eps: row.eps,
      healthRegime: row.healthRegime,
    };
  }

  private toAtencionRecord(
    row: AtencionIndividualRow,
    supportFiles: AtencionIndividualSupportFileRecord[],
  ): AtencionIndividualRecord {
    return {
      ...row,
      modalidad: row.modalidad as AtencionIndividualRecord["modalidad"],
      tipoConsulta: row.tipoConsulta as AtencionIndividualRecord["tipoConsulta"],
      finalidad: row.finalidad as AtencionIndividualRecord["finalidad"],
      causaExterna: row.causaExterna as AtencionIndividualRecord["causaExterna"],
      ordenesMedicas: row.ordenesMedicas as AtencionIndividualRecord["ordenesMedicas"],
      diagnosticos: row.diagnosticos as AtencionIndividualRecord["diagnosticos"],
      adultoMayor: {
        id: row.adultoMayorId,
        tenantId: row.tenantId,
        tenantName: row.tenantName,
        documentNumber: row.adultoDocumentNumber,
        fullName: row.adultoFullName,
        birthDate: row.adultoBirthDate,
        sex: row.adultoSex,
        eps: row.adultoEps,
        healthRegime: row.adultoHealthRegime,
      },
      supportFiles,
    };
  }

  private toHistoryRecord(row: AtencionIndividualHistoryRow): AtencionIndividualHistoryItemRecord {
    return {
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      adultoMayorId: row.adultoMayorId,
      attentionDate: row.attentionDate,
      modalidad: row.modalidad as AtencionIndividualRecord["modalidad"],
      tipoConsulta: row.tipoConsulta as AtencionIndividualRecord["tipoConsulta"],
      nombreConsulta: row.nombreConsulta,
      consecutive: row.consecutive,
      createdByUserId: row.createdByUserId,
      createdByUserFullName: row.createdByUserFullName,
      createdByUserRole: row.createdByUserRole,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
