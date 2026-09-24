import { Injectable } from "@nestjs/common";
import { createHash } from "node:crypto";
import {
  and,
  asc,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  isNotNull,
  isNull,
  lt,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  actividadGrupalActaCorrectionOperations,
  actividadGrupalActaOrganizerCounters,
  actividadGrupalDiligenciamientoFiles,
  actividadGrupalDiligenciamientoIntegrantes,
  actividadGrupalDiligenciamientos,
  actividadGrupalEmpleados,
  actividadGrupalGlobalSeriesCounters,
  actividadGrupalTipos,
  actividadesGrupales,
  adultosMayores,
  auditLogs,
  tenants,
  users,
} from "../../../database/schema";
import {
  type ActividadGrupalDiligenciamientoDetailRecord,
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalIntegranteOptionRecord,
  type ActividadGrupalRecord,
  type ActividadGrupalReportCandidateRecord,
  type ActividadGrupalTrashRecord,
  type ActividadGrupalSupportFileRecord,
  type ActividadGrupalTenantOptionRecord,
  type ActaCorrectionPreview,
  type ActaCorrectionPreviewRow,
  type AppliedActaCorrection,
  type ApplyActaCorrectionCommand,
  type PreviewActaPrefixCorrectionCommand,
  type ApplyActaPrefixCorrectionCommand,
  type CorrectActividadGrupalActaNumberCommand,
  type CreateActividadGrupalRecordCommand,
  type DeleteActividadGrupalRecordCommand,
  type FindActividadesGrupalesQuery,
  type FindActividadesGrupalesTrashQuery,
  type FindActividadGrupalByIdQuery,
  type SaveActividadGrupalDiligenciamientoRecordCommand,
  type SavedActividadGrupalDiligenciamientoRecord,
  type SearchActividadGrupalIntegrantesOptionsQuery,
  type UpdateActividadGrupalRecordCommand,
} from "../domain/actividad-grupal.types";
import { ActaCorrectionConflictError } from "../domain/actividad-grupal.types";
import {
  findNextAvailableActividadGrupalActaSequence,
  formatActividadGrupalActaNumber,
  resolveActividadGrupalActaOrganizer,
  usesSharedActividadGrupalActaSeries,
} from "../domain/actividad-grupal-acta-number";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

type ActividadGrupalSelectionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  createdByUserId: string;
  actaNumber: string;
  actaOrganizer: ActividadGrupalRecord["actaOrganizer"];
  actaSequence: number;
  previousActaNumber: string | null;
  activityName: string;
  activityType: ActividadGrupalRecord["activityType"];
  activityTypeId: string;
  activityTypeName: string;
  activityTypeIsActive: boolean;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalRecord["organizer"];
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class DrizzleActividadesGrupalesRepository implements ActividadesGrupalesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(query: FindActividadesGrupalesQuery): Promise<ActividadGrupalRecord[]> {
    const rows = await this.database.db
      .select(this.getActivitySelection())
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
      .innerJoin(
        actividadGrupalTipos,
        eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
      )
      .where(this.buildWhere(query))
      .orderBy(desc(actividadesGrupales.activityDate), desc(actividadesGrupales.startTime));

    const activityIds = rows.map((row) => row.id);
    const [countByActivityId, assignedEmployeeIdsByActivityId] = await Promise.all([
      this.findInvolvedEmployeeCounts(activityIds),
      this.findAssignedEmployeeIds(activityIds),
    ]);

    return rows.map((row) => ({
      ...row,
      involvedEmployeesCount: countByActivityId.get(row.id) ?? 0,
      assignedEmployeeIds: assignedEmployeeIdsByActivityId.get(row.id) ?? [],
    }));
  }

  async findTrashMany(
    query: FindActividadesGrupalesTrashQuery,
  ): Promise<ActividadGrupalTrashRecord[]> {
    const rows = await this.database.db
      .select(this.getTrashActivitySelection())
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
      .innerJoin(
        actividadGrupalTipos,
        eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
      )
      .innerJoin(users, eq(users.id, actividadesGrupales.deletedByUserId))
      .where(this.buildTrashWhere(query))
      .orderBy(desc(actividadesGrupales.deletedAt), desc(actividadesGrupales.activityDate));

    const countByActivityId = await this.findInvolvedEmployeeCounts(rows.map((row) => row.id));

    return rows.map((row) => ({
      id: row.id,
      tenantId: row.tenantId,
      tenantName: row.tenantName,
      createdByUserId: row.createdByUserId,
      actaNumber: row.actaNumber,
      actaOrganizer: row.actaOrganizer,
      actaSequence: row.actaSequence,
      previousActaNumber: row.previousActaNumber,
      activityName: row.activityName,
      activityType: row.activityType,
      activityTypeId: row.activityTypeId,
      activityTypeName: row.activityTypeName,
      activityTypeIsActive: row.activityTypeIsActive,
      activityDate: row.activityDate,
      startTime: row.startTime,
      endTime: row.endTime,
      organizer: row.organizer,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt!,
      deletedByUserId: row.deletedByUserId!,
      deletedByUserFullName: row.deletedByUserFullName,
      deletionReason: row.deletionReason,
      involvedEmployeesCount: countByActivityId.get(row.id) ?? 0,
    }));
  }

  async findById(
    query: FindActividadGrupalByIdQuery,
  ): Promise<ActividadGrupalDiligenciamientoDetailRecord | null> {
    const [activityRow] = await this.database.db
      .select(this.getActivitySelection())
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
      .innerJoin(
        actividadGrupalTipos,
        eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
      )
      .where(this.buildActivityScopedWhere(query, [eq(actividadesGrupales.id, query.activityId)]))
      .limit(1);

    if (activityRow === undefined) {
      return null;
    }

    const [assignedProfessionals, diligenciamientoRow, integrantes, files, involvedEmployeesCount] =
      await Promise.all([
        this.findAssignedProfessionals(query.activityId),
        this.findDiligenciamientoRow(query.activityId),
        this.findSelectedIntegrantes(query.activityId),
        this.findSupportFiles(query.activityId),
        this.findInvolvedEmployeeCounts([query.activityId]),
      ]);

    const photoFiles = files.filter((file) => file.kind === "support_photo");
    const pdfFile = files.find((file) => file.kind === "support_pdf") ?? null;

    return {
      activity: {
        ...activityRow,
        involvedEmployeesCount: involvedEmployeesCount.get(query.activityId) ?? 0,
      },
      assignedProfessionals,
      objectives: diligenciamientoRow?.objectives ?? "",
      development: diligenciamientoRow?.development ?? "",
      conclusion: diligenciamientoRow?.conclusion ?? "",
      responsibleDepartment: diligenciamientoRow?.responsibleDepartment ?? null,
      integrantes,
      photoFiles,
      pdfFile,
      diligenciamientoCreatedAt: diligenciamientoRow?.createdAt ?? null,
      diligenciamientoUpdatedAt: diligenciamientoRow?.updatedAt ?? null,
    };
  }

  async findTrashById(
    query: FindActividadGrupalByIdQuery,
  ): Promise<ActividadGrupalTrashRecord | null> {
    const [activityRow] = await this.database.db
      .select(this.getTrashActivitySelection())
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
      .innerJoin(
        actividadGrupalTipos,
        eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
      )
      .innerJoin(users, eq(users.id, actividadesGrupales.deletedByUserId))
      .where(
        this.buildTrashActivityScopedWhere(query, [eq(actividadesGrupales.id, query.activityId)]),
      )
      .limit(1);

    if (activityRow === undefined) {
      return null;
    }

    const involvedEmployeesCount = await this.findInvolvedEmployeeCounts([query.activityId]);

    return {
      ...activityRow,
      deletedAt: activityRow.deletedAt!,
      deletedByUserId: activityRow.deletedByUserId!,
      deletedByUserFullName: activityRow.deletedByUserFullName,
      involvedEmployeesCount: involvedEmployeesCount.get(query.activityId) ?? 0,
    };
  }

  async findTenantOptions(): Promise<ActividadGrupalTenantOptionRecord[]> {
    return await this.database.db
      .select({
        id: tenants.id,
        name: tenants.name,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true))
      .orderBy(asc(tenants.name));
  }

  async findActaReportCandidates(query: {
    tenantId: string;
    period: string;
  }): Promise<ActividadGrupalReportCandidateRecord[]> {
    const monthRange = query.period === "ALL" ? null : resolveMonthRange(query.period);
    const conditions: SQL[] = [
      eq(actividadesGrupales.tenantId, query.tenantId),
      isNull(actividadesGrupales.deletedAt),
    ];

    if (monthRange !== null) {
      conditions.push(
        gte(actividadesGrupales.activityDate, monthRange.startDate),
        lt(actividadesGrupales.activityDate, monthRange.endDateExclusive),
      );
    }

    const rows = await this.database.db
      .select({
        id: actividadesGrupales.id,
        tenantId: actividadesGrupales.tenantId,
        tenantName: tenants.name,
        actaNumber: actividadesGrupales.actaNumber,
        activityName: actividadesGrupales.activityName,
        activityDate: actividadesGrupales.activityDate,
      })
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
      .innerJoin(
        actividadGrupalDiligenciamientos,
        eq(actividadGrupalDiligenciamientos.activityId, actividadesGrupales.id),
      )
      .where(and(...conditions))
      .orderBy(asc(actividadesGrupales.activityDate), asc(actividadesGrupales.actaNumber));

    return rows;
  }

  async findActiveEmpleadoOptions(
    tenantId: string,
  ): Promise<ActividadGrupalEmpleadoOptionRecord[]> {
    return await this.database.db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(and(eq(users.tenantId, tenantId), eq(users.isActive, true)))
      .orderBy(asc(users.fullName));
  }

  async searchIntegranteOptions(
    query: SearchActividadGrupalIntegrantesOptionsQuery,
  ): Promise<ActividadGrupalIntegranteOptionRecord[]> {
    const conditions: SQL[] = [
      eq(adultosMayores.tenantId, query.tenantId),
      isNull(adultosMayores.deletedAt),
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
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
        status: adultosMayores.status,
        deathDate: adultosMayores.deathDate,
      })
      .from(adultosMayores)
      .where(and(...conditions))
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names))
      .limit(12);

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
      status: row.status,
      deathDate: row.deathDate,
    }));
  }

  async findIntegrantesByIds(
    tenantId: string,
    integranteIds: string[],
  ): Promise<ActividadGrupalIntegranteOptionRecord[]> {
    if (integranteIds.length === 0) {
      return [];
    }

    const rows = await this.database.db
      .select({
        id: adultosMayores.id,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
        status: adultosMayores.status,
        deathDate: adultosMayores.deathDate,
      })
      .from(adultosMayores)
      .where(
        and(
          eq(adultosMayores.tenantId, tenantId),
          inArray(adultosMayores.id, integranteIds),
          isNull(adultosMayores.deletedAt),
        ),
      );

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
      status: row.status,
      deathDate: row.deathDate,
    }));
  }

  async create(command: CreateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const actaOrganizer = resolveActividadGrupalActaOrganizer(command.organizer);
      const isGlobalSeries = command.customConsecutive?.scope === "global";
      const actaSeriesKey = isGlobalSeries
        ? "global"
        : command.customConsecutive === null
          ? `legacy:${actaOrganizer}`
          : `activity-type:${command.activityTypeId}`;
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`actividades-grupales-acta:${command.tenantId}`}))`,
      );
      const activeActaSequences = await tx
        .select({ actaSequence: actividadesGrupales.actaSequence })
        .from(actividadesGrupales)
        .where(
          and(
            eq(actividadesGrupales.tenantId, command.tenantId),
            ...(isGlobalSeries ? [] : [eq(actividadesGrupales.actaSeriesKey, actaSeriesKey)]),
            isNull(actividadesGrupales.deletedAt),
          ),
        );
      const highestActiveSequence = activeActaSequences.reduce(
        (highest, row) => Math.max(highest, row.actaSequence),
        0,
      );
      const [globalCounter] = isGlobalSeries
        ? await tx
            .select({ lastValue: actividadGrupalGlobalSeriesCounters.lastValue })
            .from(actividadGrupalGlobalSeriesCounters)
            .where(eq(actividadGrupalGlobalSeriesCounters.tenantId, command.tenantId))
        : [];
      const nextSequence = isGlobalSeries
        ? Math.max((globalCounter?.lastValue ?? 0) + 1, highestActiveSequence + 1)
        : (command.customConsecutive?.nextValue ??
          findNextAvailableActividadGrupalActaSequence(
            activeActaSequences.map((row) => row.actaSequence),
          ));
      const counterFloor = Math.max(nextSequence, highestActiveSequence);

      if (!isGlobalSeries) {
        await tx
          .insert(actividadGrupalActaOrganizerCounters)
          .values({
            tenantId: command.tenantId,
            organizer: actaOrganizer,
            lastValue: counterFloor,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [
              actividadGrupalActaOrganizerCounters.tenantId,
              actividadGrupalActaOrganizerCounters.organizer,
            ],
            set: {
              lastValue: sql`greatest(${actividadGrupalActaOrganizerCounters.lastValue}, ${counterFloor})`,
              updatedAt: now,
            },
          });
      }

      const actaNumber =
        command.customConsecutive === null
          ? formatActividadGrupalActaNumber(actaOrganizer, nextSequence)
          : command.customConsecutive.prefix + "-" + String(nextSequence).padStart(3, "0");

      const [created] = await tx
        .insert(actividadesGrupales)
        .values({
          tenantId: command.tenantId,
          actaNumber,
          actaOrganizer,
          actaSeriesKey,
          actaSequence: nextSequence,
          activityName: command.activityName,
          activityType: command.activityType,
          activityTypeId: command.activityTypeId,
          activityDate: command.activityDate,
          startTime: command.startTime,
          endTime: command.endTime,
          organizer: command.organizer,
          createdByUserId: command.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning({ id: actividadesGrupales.id });

      if (created === undefined) {
        throw new Error("No fue posible crear la actividad grupal.");
      }

      if (isGlobalSeries) {
        await tx
          .insert(actividadGrupalGlobalSeriesCounters)
          .values({
            tenantId: command.tenantId,
            lastValue: nextSequence,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: actividadGrupalGlobalSeriesCounters.tenantId,
            set: {
              lastValue: nextSequence,
              updatedAt: now,
            },
          });
      } else if (command.customConsecutive !== null) {
        await tx
          .update(actividadGrupalTipos)
          .set({ consecutiveNextValue: nextSequence + 1, updatedAt: now })
          .where(eq(actividadGrupalTipos.id, command.activityTypeId));
      }

      await tx.insert(actividadGrupalEmpleados).values(
        command.employeeIds.map((employeeId) => ({
          activityId: created.id,
          employeeId,
        })),
      );

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.created",
        targetTenantId: command.tenantId,
        summary: `Actividad grupal creada #${actaNumber}: ${command.activityName}`,
        metadata: {
          actaNumber,
          actaOrganizer,
          actaSequence: nextSequence,
          activityType: command.activityType,
          organizer: command.organizer,
          involvedEmployeesCount: command.employeeIds.length,
        },
      });

      const [row] = await tx
        .select(this.getActivitySelection())
        .from(actividadesGrupales)
        .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
        .innerJoin(
          actividadGrupalTipos,
          eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
        )
        .where(eq(actividadesGrupales.id, created.id))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar la actividad creada.");
      }

      return {
        ...row,
        involvedEmployeesCount: command.employeeIds.length,
      };
    });
  }

  async update(command: UpdateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();

      const [updated] = await tx
        .update(actividadesGrupales)
        .set({
          activityName: command.activityName,
          activityType: command.activityType,
          activityTypeId: command.activityTypeId,
          activityDate: command.activityDate,
          startTime: command.startTime,
          endTime: command.endTime,
          organizer: command.organizer,
          updatedAt: now,
        })
        .where(eq(actividadesGrupales.id, command.activityId))
        .returning({ id: actividadesGrupales.id, tenantId: actividadesGrupales.tenantId });

      if (updated === undefined) {
        throw new Error("No fue posible actualizar la actividad grupal.");
      }

      await tx
        .delete(actividadGrupalEmpleados)
        .where(eq(actividadGrupalEmpleados.activityId, command.activityId));

      await tx.insert(actividadGrupalEmpleados).values(
        command.employeeIds.map((employeeId) => ({
          activityId: command.activityId,
          employeeId,
        })),
      );

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.updated",
        targetTenantId: updated.tenantId,
        summary: `Actividad grupal actualizada #${updated.id}: ${command.activityName}`,
        metadata: {
          activityId: command.activityId,
          activityType: command.activityType,
          organizer: command.organizer,
          involvedEmployeesCount: command.employeeIds.length,
        },
      });

      const [row] = await tx
        .select(this.getActivitySelection())
        .from(actividadesGrupales)
        .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
        .innerJoin(
          actividadGrupalTipos,
          eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
        )
        .where(eq(actividadesGrupales.id, command.activityId))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar la actividad actualizada.");
      }

      return {
        ...row,
        involvedEmployeesCount: command.employeeIds.length,
      };
    });
  }

  async correctActaNumber(
    command: CorrectActividadGrupalActaNumberCommand,
  ): Promise<ActividadGrupalRecord> {
    const corrected = await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [current] = await tx
        .select({
          id: actividadesGrupales.id,
          tenantId: actividadesGrupales.tenantId,
          actaNumber: actividadesGrupales.actaNumber,
          organizer: actividadesGrupales.organizer,
          activityName: actividadesGrupales.activityName,
        })
        .from(actividadesGrupales)
        .where(eq(actividadesGrupales.id, command.activityId))
        .limit(1);

      if (current === undefined) {
        throw new Error("La actividad grupal no fue encontrada.");
      }

      const actaOrganizer = resolveActividadGrupalActaOrganizer(command.organizer);
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`actividades-grupales-acta:${current.tenantId}`}))`,
      );

      const [counter] = await tx
        .insert(actividadGrupalActaOrganizerCounters)
        .values({
          tenantId: current.tenantId,
          organizer: actaOrganizer,
          lastValue: 1,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            actividadGrupalActaOrganizerCounters.tenantId,
            actividadGrupalActaOrganizerCounters.organizer,
          ],
          set: {
            lastValue: sql`${actividadGrupalActaOrganizerCounters.lastValue} + 1`,
            updatedAt: now,
          },
        })
        .returning({ lastValue: actividadGrupalActaOrganizerCounters.lastValue });

      if (counter === undefined) {
        throw new Error("No fue posible generar el consecutivo corregido.");
      }

      const actaNumber = formatActividadGrupalActaNumber(actaOrganizer, counter.lastValue);
      await tx
        .update(actividadesGrupales)
        .set({
          organizer: command.organizer,
          actaOrganizer,
          actaSequence: counter.lastValue,
          actaNumber,
          previousActaNumber: current.actaNumber,
          actaNumberCorrectedAt: now,
          actaNumberCorrectedByUserId: command.actorUserId,
          updatedAt: now,
        })
        .where(eq(actividadesGrupales.id, command.activityId));

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.acta-number-corrected",
        targetTenantId: current.tenantId,
        summary: `Consecutivo corregido de ${current.actaNumber} a ${actaNumber}.`,
        metadata: {
          activityId: command.activityId,
          previousActaNumber: current.actaNumber,
          newActaNumber: actaNumber,
          previousOrganizer: current.organizer,
          newOrganizer: command.organizer,
          reason: command.reason,
        },
      });

      const [row] = await tx
        .select(this.getActivitySelection())
        .from(actividadesGrupales)
        .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
        .innerJoin(
          actividadGrupalTipos,
          eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
        )
        .where(eq(actividadesGrupales.id, command.activityId))
        .limit(1);

      if (row === undefined) {
        throw new Error("No fue posible consultar el acta corregida.");
      }

      return row;
    });

    const counts = await this.findInvolvedEmployeeCounts([corrected.id]);
    return {
      ...corrected,
      involvedEmployeesCount: counts.get(corrected.id) ?? 0,
    };
  }

  async previewActaNumberCorrection(
    tenantId: string,
    actorUserId: string,
    organizer: import("@cuidarte/contracts").ActividadGrupalOrganizer | null,
  ): Promise<ActaCorrectionPreview> {
    const actaOrganizer =
      organizer === null ? null : resolveActividadGrupalActaOrganizer(organizer);
    const rows = await this.database.db
      .select({
        id: actividadesGrupales.id,
        activityDate: actividadesGrupales.activityDate,
        startTime: actividadesGrupales.startTime,
        endTime: actividadesGrupales.endTime,
        organizer: actividadesGrupales.organizer,
        actaNumber: actividadesGrupales.actaNumber,
        actaOrganizer: actividadesGrupales.actaOrganizer,
        actaSequence: actividadesGrupales.actaSequence,
        createdAt: actividadesGrupales.createdAt,
        updatedAt: actividadesGrupales.updatedAt,
        deletedAt: actividadesGrupales.deletedAt,
      })
      .from(actividadesGrupales)
      .where(
        and(
          eq(actividadesGrupales.tenantId, tenantId),
          isNull(actividadesGrupales.deletedAt),
          sql`${actividadesGrupales.actaSeriesKey} like 'legacy:%'`,
          actaOrganizer === null ? undefined : eq(actividadesGrupales.actaOrganizer, actaOrganizer),
        ),
      )
      .orderBy(
        asc(actividadesGrupales.activityDate),
        asc(actividadesGrupales.startTime),
        asc(actividadesGrupales.endTime),
        asc(actividadesGrupales.createdAt),
        asc(actividadesGrupales.id),
      );

    const previewRows = buildCorrectionPreviewRows(rows);
    const snapshotHash = hashCorrectionSnapshot(rows);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const [operation] = await this.database.db
      .insert(actividadGrupalActaCorrectionOperations)
      .values({
        tenantId,
        requestedByUserId: actorUserId,
        organizer: actaOrganizer,
        snapshotHash,
        expiresAt,
      })
      .returning({ id: actividadGrupalActaCorrectionOperations.id });

    if (operation === undefined) {
      throw new Error("No fue posible preparar la correccion masiva.");
    }

    const changedCount = previewRows.filter(
      (row) => row.currentActaNumber !== row.proposedActaNumber,
    ).length;

    return {
      operationToken: operation.id,
      operationId: operation.id,
      tenantId,
      previewExpiresAt: expiresAt,
      totalCount: previewRows.length,
      changedCount,
      unchangedCount: previewRows.length - changedCount,
      warningCount: rows.filter((row) => row.startTime >= "00:00" && row.startTime < "06:00")
        .length,
      rows: previewRows,
    };
  }

  async previewActaPrefixCorrection(
    command: PreviewActaPrefixCorrectionCommand,
  ): Promise<ActaCorrectionPreview> {
    const prefix = command.prefix.trim().toUpperCase();

    if (!/^[A-Z0-9]{2,24}$/.test(prefix)) {
      throw new ActaCorrectionConflictError("El prefijo solo puede incluir letras y números.");
    }

    const [activityType] = await this.database.db
      .select({ id: actividadGrupalTipos.id })
      .from(actividadGrupalTipos)
      .where(
        and(
          eq(actividadGrupalTipos.id, command.activityTypeId),
          eq(actividadGrupalTipos.tenantId, command.tenantId),
        ),
      )
      .limit(1);

    if (activityType === undefined) {
      throw new ActaCorrectionConflictError("La actividad no existe en el centro seleccionado.");
    }

    const rows = await this.database.db
      .select({
        id: actividadesGrupales.id,
        activityDate: actividadesGrupales.activityDate,
        startTime: actividadesGrupales.startTime,
        endTime: actividadesGrupales.endTime,
        organizer: actividadesGrupales.organizer,
        actaNumber: actividadesGrupales.actaNumber,
        actaSeriesKey: actividadesGrupales.actaSeriesKey,
        actaOrganizer: actividadesGrupales.actaOrganizer,
        actaSequence: actividadesGrupales.actaSequence,
        createdAt: actividadesGrupales.createdAt,
        updatedAt: actividadesGrupales.updatedAt,
        deletedAt: actividadesGrupales.deletedAt,
      })
      .from(actividadesGrupales)
      .where(
        and(
          eq(actividadesGrupales.tenantId, command.tenantId),
          eq(actividadesGrupales.activityTypeId, command.activityTypeId),
          isNull(actividadesGrupales.deletedAt),
        ),
      )
      .orderBy(
        asc(actividadesGrupales.activityDate),
        asc(actividadesGrupales.startTime),
        asc(actividadesGrupales.endTime),
        asc(actividadesGrupales.createdAt),
        asc(actividadesGrupales.id),
      );

    const previewRows = buildPrefixCorrectionPreviewRows(rows, prefix);
    const snapshotHash = hashCorrectionSnapshot(rows);
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const [operation] = await this.database.db
      .insert(actividadGrupalActaCorrectionOperations)
      .values({
        tenantId: command.tenantId,
        requestedByUserId: command.actorUserId,
        activityTypeId: command.activityTypeId,
        targetPrefix: prefix,
        snapshotHash,
        expiresAt,
      })
      .returning({ id: actividadGrupalActaCorrectionOperations.id });

    if (operation === undefined) {
      throw new Error("No fue posible preparar la normalización.");
    }

    const changedCount = previewRows.filter((row, index) => {
      const source = rows[index];
      return (
        source?.actaNumber !== row.proposedActaNumber ||
        source?.actaOrganizer !== resolveActividadGrupalActaOrganizer(row.organizer) ||
        source?.actaSequence !== row.sequence ||
        source?.actaSeriesKey !== `activity-type:${command.activityTypeId}`
      );
    }).length;

    return {
      operationToken: operation.id,
      operationId: operation.id,
      tenantId: command.tenantId,
      previewExpiresAt: expiresAt,
      totalCount: previewRows.length,
      changedCount,
      unchangedCount: previewRows.length - changedCount,
      warningCount: countScheduleWarnings(previewRows),
      rows: previewRows,
    };
  }

  async applyActaPrefixCorrection(
    command: ApplyActaPrefixCorrectionCommand,
  ): Promise<AppliedActaCorrection> {
    return await this.database.db.transaction(async (tx) => {
      const [operation] = await tx
        .select()
        .from(actividadGrupalActaCorrectionOperations)
        .where(
          and(
            eq(actividadGrupalActaCorrectionOperations.id, command.operationToken),
            eq(actividadGrupalActaCorrectionOperations.requestedByUserId, command.actorUserId),
            isNull(actividadGrupalActaCorrectionOperations.usedAt),
          ),
        )
        .limit(1);

      if (
        operation === undefined ||
        operation.expiresAt <= new Date() ||
        operation.activityTypeId === null ||
        operation.targetPrefix === null
      ) {
        throw new ActaCorrectionConflictError(
          "La vista previa de normalización ya no está vigente.",
        );
      }

      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`actividades-grupales-acta:${operation.tenantId}`}))`,
      );

      const [lockedOperation] = await tx
        .select()
        .from(actividadGrupalActaCorrectionOperations)
        .where(
          and(
            eq(actividadGrupalActaCorrectionOperations.id, operation.id),
            eq(actividadGrupalActaCorrectionOperations.requestedByUserId, command.actorUserId),
            isNull(actividadGrupalActaCorrectionOperations.usedAt),
          ),
        )
        .limit(1);

      if (lockedOperation === undefined || lockedOperation.expiresAt <= new Date()) {
        throw new ActaCorrectionConflictError(
          "La vista previa de normalización ya no está vigente.",
        );
      }

      const rows = await tx
        .select({
          id: actividadesGrupales.id,
          activityDate: actividadesGrupales.activityDate,
          startTime: actividadesGrupales.startTime,
          endTime: actividadesGrupales.endTime,
          organizer: actividadesGrupales.organizer,
          actaNumber: actividadesGrupales.actaNumber,
          actaSeriesKey: actividadesGrupales.actaSeriesKey,
          actaOrganizer: actividadesGrupales.actaOrganizer,
          actaSequence: actividadesGrupales.actaSequence,
          createdAt: actividadesGrupales.createdAt,
          updatedAt: actividadesGrupales.updatedAt,
          deletedAt: actividadesGrupales.deletedAt,
        })
        .from(actividadesGrupales)
        .where(
          and(
            eq(actividadesGrupales.tenantId, operation.tenantId),
            eq(actividadesGrupales.activityTypeId, operation.activityTypeId),
            isNull(actividadesGrupales.deletedAt),
          ),
        )
        .orderBy(
          asc(actividadesGrupales.activityDate),
          asc(actividadesGrupales.startTime),
          asc(actividadesGrupales.endTime),
          asc(actividadesGrupales.createdAt),
          asc(actividadesGrupales.id),
        );

      if (hashCorrectionSnapshot(rows) !== operation.snapshotHash) {
        throw new ActaCorrectionConflictError();
      }

      const targetSeriesKey = `activity-type:${operation.activityTypeId}`;
      const previewRows = buildPrefixCorrectionPreviewRows(rows, operation.targetPrefix);
      const sourceRowsById = new Map(rows.map((row) => [row.id, row]));
      const changedRows = previewRows.filter((row) => {
        const source = sourceRowsById.get(row.activityId);
        return (
          source?.actaNumber !== row.proposedActaNumber ||
          source?.actaOrganizer !== resolveActividadGrupalActaOrganizer(row.organizer) ||
          source?.actaSequence !== row.sequence ||
          source?.actaSeriesKey !== targetSeriesKey
        );
      });

      const activeTenantRows = await tx
        .select({
          id: actividadesGrupales.id,
          actaNumber: actividadesGrupales.actaNumber,
          actaSeriesKey: actividadesGrupales.actaSeriesKey,
          actaOrganizer: actividadesGrupales.actaOrganizer,
          actaSequence: actividadesGrupales.actaSequence,
        })
        .from(actividadesGrupales)
        .where(
          and(
            eq(actividadesGrupales.tenantId, operation.tenantId),
            isNull(actividadesGrupales.deletedAt),
          ),
        );

      assertCorrectionFinalStateIsUnique(activeTenantRows, previewRows, targetSeriesKey);

      const temporaryRows = buildTemporaryCorrectionRows({
        operationId: operation.id,
        activeRows: activeTenantRows,
        changedRows,
        targetSeriesKey,
      });

      for (const row of temporaryRows) {
        await tx
          .update(actividadesGrupales)
          .set({
            actaNumber: row.temporaryActaNumber,
            actaSeriesKey: row.actaSeriesKey,
            actaOrganizer: row.actaOrganizer,
            actaSequence: row.temporaryActaSequence,
            updatedAt: new Date(),
          })
          .where(eq(actividadesGrupales.id, row.id));
      }

      for (const row of changedRows) {
        const source = sourceRowsById.get(row.activityId);
        if (source === undefined) {
          throw new ActaCorrectionConflictError();
        }
        await tx
          .update(actividadesGrupales)
          .set({
            actaNumber: row.proposedActaNumber,
            actaSeriesKey: targetSeriesKey,
            actaOrganizer: resolveActividadGrupalActaOrganizer(row.organizer),
            actaSequence: row.sequence,
            previousActaNumber:
              source.actaNumber === row.proposedActaNumber ? undefined : source.actaNumber,
            actaNumberCorrectedAt: new Date(),
            actaNumberCorrectedByUserId: command.actorUserId,
            updatedAt: new Date(),
          })
          .where(eq(actividadesGrupales.id, row.activityId));

        await tx.insert(auditLogs).values({
          actorUserId: command.actorUserId,
          action: "actividades-grupales.acta-normalized",
          targetTenantId: operation.tenantId,
          summary: `Acta normalizada de ${source.actaNumber} a ${row.proposedActaNumber}.`,
          metadata: {
            operationId: operation.id,
            activityId: row.activityId,
            activityTypeId: operation.activityTypeId,
            previousActaNumber: source.actaNumber,
            newActaNumber: row.proposedActaNumber,
            previousSeriesKey: source.actaSeriesKey,
            newSeriesKey: targetSeriesKey,
            previousSequence: source.actaSequence,
            newSequence: row.sequence,
            reason: command.reason,
          },
        });
      }

      await tx
        .update(actividadGrupalTipos)
        .set({
          consecutivePrefix: operation.targetPrefix,
          consecutiveNextValue: previewRows.length + 1,
          updatedAt: new Date(),
        })
        .where(eq(actividadGrupalTipos.id, operation.activityTypeId));
      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.acta-normalization-applied",
        targetTenantId: operation.tenantId,
        summary: `Consecutivos normalizados y actas migradas a la serie ${operation.targetPrefix}.`,
        metadata: {
          operationId: operation.id,
          activityTypeId: operation.activityTypeId,
          targetPrefix: operation.targetPrefix,
          targetSeriesKey,
          totalCount: previewRows.length,
          changedCount: changedRows.length,
          nextValue: previewRows.length + 1,
          reason: command.reason,
        },
      });

      await tx
        .update(actividadGrupalActaCorrectionOperations)
        .set({ usedAt: new Date() })
        .where(eq(actividadGrupalActaCorrectionOperations.id, operation.id));

      return {
        operationId: operation.id,
        totalCount: previewRows.length,
        changedCount: changedRows.length,
        unchangedCount: previewRows.length - changedRows.length,
      };
    });
  }

  async applyActaNumberCorrection(
    command: ApplyActaCorrectionCommand,
  ): Promise<AppliedActaCorrection> {
    return await this.database.db.transaction(async (tx) => {
      const [operation] = await tx
        .select()
        .from(actividadGrupalActaCorrectionOperations)
        .where(
          and(
            eq(actividadGrupalActaCorrectionOperations.id, command.operationToken),
            eq(actividadGrupalActaCorrectionOperations.requestedByUserId, command.actorUserId),
            isNull(actividadGrupalActaCorrectionOperations.usedAt),
          ),
        )
        .limit(1);

      if (operation === undefined || operation.expiresAt <= new Date()) {
        throw new ActaCorrectionConflictError("La vista previa expiro o ya fue utilizada.");
      }

      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${`actividades-grupales-acta:${operation.tenantId}`}))`,
      );

      const [lockedOperation] = await tx
        .select()
        .from(actividadGrupalActaCorrectionOperations)
        .where(
          and(
            eq(actividadGrupalActaCorrectionOperations.id, operation.id),
            eq(actividadGrupalActaCorrectionOperations.requestedByUserId, command.actorUserId),
            isNull(actividadGrupalActaCorrectionOperations.usedAt),
          ),
        )
        .limit(1);

      if (lockedOperation === undefined || lockedOperation.expiresAt <= new Date()) {
        throw new ActaCorrectionConflictError("La vista previa expiro o ya fue utilizada.");
      }

      const rows = await tx
        .select({
          id: actividadesGrupales.id,
          activityDate: actividadesGrupales.activityDate,
          startTime: actividadesGrupales.startTime,
          endTime: actividadesGrupales.endTime,
          organizer: actividadesGrupales.organizer,
          actaNumber: actividadesGrupales.actaNumber,
          actaSeriesKey: actividadesGrupales.actaSeriesKey,
          actaOrganizer: actividadesGrupales.actaOrganizer,
          actaSequence: actividadesGrupales.actaSequence,
          createdAt: actividadesGrupales.createdAt,
          updatedAt: actividadesGrupales.updatedAt,
          deletedAt: actividadesGrupales.deletedAt,
        })
        .from(actividadesGrupales)
        .where(
          and(
            eq(actividadesGrupales.tenantId, lockedOperation.tenantId),
            isNull(actividadesGrupales.deletedAt),
            sql`${actividadesGrupales.actaSeriesKey} like 'legacy:%'`,
            lockedOperation.organizer === null
              ? undefined
              : eq(actividadesGrupales.actaOrganizer, lockedOperation.organizer),
          ),
        )
        .orderBy(
          asc(actividadesGrupales.activityDate),
          asc(actividadesGrupales.startTime),
          asc(actividadesGrupales.endTime),
          asc(actividadesGrupales.createdAt),
          asc(actividadesGrupales.id),
        );

      if (hashCorrectionSnapshot(rows) !== lockedOperation.snapshotHash) {
        throw new ActaCorrectionConflictError();
      }

      const previewRows = buildCorrectionPreviewRows(rows);
      const sourceRowsById = new Map(rows.map((row) => [row.id, row]));
      const changedRows = previewRows.filter((row) =>
        hasCorrectionTargetChanged(sourceRowsById.get(row.activityId), row),
      );

      const activeTenantRows = await tx
        .select({
          id: actividadesGrupales.id,
          actaNumber: actividadesGrupales.actaNumber,
          actaSeriesKey: actividadesGrupales.actaSeriesKey,
          actaOrganizer: actividadesGrupales.actaOrganizer,
          actaSequence: actividadesGrupales.actaSequence,
        })
        .from(actividadesGrupales)
        .where(
          and(
            eq(actividadesGrupales.tenantId, lockedOperation.tenantId),
            isNull(actividadesGrupales.deletedAt),
          ),
        );

      assertCorrectionFinalStateIsUnique(activeTenantRows, previewRows);

      const temporaryRows = buildTemporaryCorrectionRows({
        operationId: lockedOperation.id,
        activeRows: activeTenantRows,
        changedRows,
      });

      for (const row of temporaryRows) {
        await tx
          .update(actividadesGrupales)
          .set({
            actaNumber: row.temporaryActaNumber,
            actaSeriesKey: row.actaSeriesKey,
            actaOrganizer: row.actaOrganizer,
            actaSequence: row.temporaryActaSequence,
            updatedAt: new Date(),
          })
          .where(eq(actividadesGrupales.id, row.id));
      }

      const maxByOrganizer = new Map<ActividadGrupalRecord["actaOrganizer"], number>();
      for (const row of previewRows) {
        const actaOrganizer = resolveActividadGrupalActaOrganizer(row.organizer);
        maxByOrganizer.set(
          actaOrganizer,
          Math.max(maxByOrganizer.get(actaOrganizer) ?? 0, row.sequence),
        );
      }

      for (const row of changedRows) {
        await tx
          .update(actividadesGrupales)
          .set({
            actaNumber: row.proposedActaNumber,
            actaOrganizer: resolveActividadGrupalActaOrganizer(row.organizer),
            actaSequence: row.sequence,
            previousActaNumber:
              row.currentActaNumber === row.proposedActaNumber ? undefined : row.currentActaNumber,
            actaNumberCorrectedAt:
              row.currentActaNumber === row.proposedActaNumber ? undefined : new Date(),
            actaNumberCorrectedByUserId:
              row.currentActaNumber === row.proposedActaNumber ? undefined : command.actorUserId,
            updatedAt: new Date(),
          })
          .where(eq(actividadesGrupales.id, row.activityId));
      }

      for (const [organizer, lastValue] of maxByOrganizer) {
        await tx
          .insert(actividadGrupalActaOrganizerCounters)
          .values({
            tenantId: lockedOperation.tenantId,
            organizer,
            lastValue,
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: [
              actividadGrupalActaOrganizerCounters.tenantId,
              actividadGrupalActaOrganizerCounters.organizer,
            ],
            set: { lastValue, updatedAt: new Date() },
          });
      }

      for (const row of changedRows) {
        await tx.insert(auditLogs).values({
          actorUserId: command.actorUserId,
          action: "actividades-grupales.acta-number-corrected",
          targetTenantId: lockedOperation.tenantId,
          summary: `Consecutivo corregido de ${row.currentActaNumber} a ${row.proposedActaNumber}.`,
          metadata: {
            operationId: lockedOperation.id,
            activityId: row.activityId,
            previousActaNumber: row.currentActaNumber,
            newActaNumber: row.proposedActaNumber,
            previousOrganizer: row.organizer,
            newOrganizer: row.organizer,
            organizer: row.organizer,
            reason: command.reason,
          },
        });
      }

      await tx
        .update(actividadGrupalActaCorrectionOperations)
        .set({ usedAt: new Date() })
        .where(eq(actividadGrupalActaCorrectionOperations.id, lockedOperation.id));
      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.acta-number-bulk-corrected",
        targetTenantId: lockedOperation.tenantId,
        summary: `Renumeracion masiva de actas: ${changedRows.length} corregidas.`,
        metadata: {
          operationId: lockedOperation.id,
          tenantId: lockedOperation.tenantId,
          reason: command.reason,
          changedCount: changedRows.length,
          unchangedCount: previewRows.length - changedRows.length,
          ordering: ["activityDate", "startTime", "endTime", "createdAt", "id"],
        },
      });

      return {
        operationId: lockedOperation.id,
        totalCount: previewRows.length,
        changedCount: changedRows.length,
        unchangedCount: previewRows.length - changedRows.length,
      };
    });
  }

  async delete(command: DeleteActividadGrupalRecordCommand): Promise<void> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();

      const [activity] = await tx
        .select({
          id: actividadesGrupales.id,
          tenantId: actividadesGrupales.tenantId,
          actaNumber: actividadesGrupales.actaNumber,
          activityName: actividadesGrupales.activityName,
        })
        .from(actividadesGrupales)
        .where(
          and(
            eq(actividadesGrupales.id, command.activityId),
            isNull(actividadesGrupales.deletedAt),
          ),
        )
        .limit(1);

      if (activity === undefined) {
        throw new Error("No fue posible eliminar la actividad grupal.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.deleted",
        targetTenantId: activity.tenantId,
        summary: `Acta eliminada #${activity.actaNumber}: ${activity.activityName}`,
        metadata: {
          activityId: command.activityId,
          actaNumber: activity.actaNumber,
          reason: command.reason,
        },
      });

      await tx
        .update(actividadesGrupales)
        .set({
          deletedAt: now,
          deletedByUserId: command.actorUserId,
          deletionReason: command.reason,
          updatedAt: now,
        })
        .where(
          and(
            eq(actividadesGrupales.id, command.activityId),
            isNull(actividadesGrupales.deletedAt),
          ),
        );
    });
  }

  async saveDiligenciamiento(
    command: SaveActividadGrupalDiligenciamientoRecordCommand,
  ): Promise<SavedActividadGrupalDiligenciamientoRecord> {
    const removedFiles = await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const existingFiles = await tx
        .select({
          id: actividadGrupalDiligenciamientoFiles.id,
          activityId: actividadGrupalDiligenciamientoFiles.activityId,
          kind: actividadGrupalDiligenciamientoFiles.kind,
          originalName: actividadGrupalDiligenciamientoFiles.originalName,
          mimeType: actividadGrupalDiligenciamientoFiles.mimeType,
          sizeBytes: actividadGrupalDiligenciamientoFiles.sizeBytes,
          relativePath: actividadGrupalDiligenciamientoFiles.relativePath,
          createdAt: actividadGrupalDiligenciamientoFiles.createdAt,
        })
        .from(actividadGrupalDiligenciamientoFiles)
        .where(eq(actividadGrupalDiligenciamientoFiles.activityId, command.activityId));

      const newPdfProvided = command.newFiles.some((file) => file.kind === "support_pdf");
      const removedPhotoFiles = existingFiles.filter(
        (file) => file.kind === "support_photo" && command.removedPhotoFileIds.includes(file.id),
      );
      const removedPdfFiles = existingFiles.filter(
        (file) => file.kind === "support_pdf" && (command.removePdfFile || newPdfProvided),
      );
      const removedFileIds = [...removedPhotoFiles, ...removedPdfFiles].map((file) => file.id);

      await tx
        .insert(actividadGrupalDiligenciamientos)
        .values({
          activityId: command.activityId,
          objectives: command.objectives,
          development: command.development,
          conclusion: command.conclusion,
          responsibleDepartment: command.responsibleDepartment,
          createdByUserId: command.actorUserId,
          updatedByUserId: command.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: actividadGrupalDiligenciamientos.activityId,
          set: {
            objectives: command.objectives,
            development: command.development,
            conclusion: command.conclusion,
            responsibleDepartment: command.responsibleDepartment,
            updatedByUserId: command.actorUserId,
            updatedAt: now,
          },
        });

      await tx
        .delete(actividadGrupalDiligenciamientoIntegrantes)
        .where(eq(actividadGrupalDiligenciamientoIntegrantes.activityId, command.activityId));

      if (command.integranteIds.length > 0) {
        await tx.insert(actividadGrupalDiligenciamientoIntegrantes).values(
          command.integranteIds.map((integranteId) => ({
            activityId: command.activityId,
            adultoMayorId: integranteId,
          })),
        );
      }

      if (removedFileIds.length > 0) {
        await tx
          .delete(actividadGrupalDiligenciamientoFiles)
          .where(inArray(actividadGrupalDiligenciamientoFiles.id, removedFileIds));
      }

      if (command.newFiles.length > 0) {
        await tx.insert(actividadGrupalDiligenciamientoFiles).values(
          command.newFiles.map((file) => ({
            activityId: command.activityId,
            kind: file.kind,
            originalName: file.originalName,
            mimeType: file.mimeType,
            sizeBytes: file.sizeBytes,
            relativePath: file.relativePath,
            createdByUserId: command.actorUserId,
            createdAt: now,
          })),
        );
      }

      const [activity] = await tx
        .select({
          tenantId: actividadesGrupales.tenantId,
          actaNumber: actividadesGrupales.actaNumber,
          activityName: actividadesGrupales.activityName,
        })
        .from(actividadesGrupales)
        .where(eq(actividadesGrupales.id, command.activityId))
        .limit(1);

      if (activity !== undefined) {
        await tx.insert(auditLogs).values({
          actorUserId: command.actorUserId,
          action: "actividades-grupales.diligenciamiento.saved",
          targetTenantId: activity.tenantId,
          summary: `Diligenciamiento actualizado #${activity.actaNumber}: ${activity.activityName}`,
          metadata: {
            activityId: command.activityId,
            integrantesCount: command.integranteIds.length,
            photoFilesAdded: command.newFiles.filter((file) => file.kind === "support_photo")
              .length,
            pdfUpdated: newPdfProvided,
          },
        });
      }

      return [...removedPhotoFiles, ...removedPdfFiles];
    });

    const detail = await this.findById({
      activityId: command.activityId,
      scope: { type: "all" },
      permittedOrganizers: null,
    });

    if (detail === null) {
      throw new Error("No fue posible consultar el diligenciamiento guardado.");
    }

    return {
      detail,
      removedFiles,
    };
  }

  private async findAssignedProfessionals(
    activityId: string,
  ): Promise<ActividadGrupalEmpleadoOptionRecord[]> {
    return await this.database.db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      })
      .from(actividadGrupalEmpleados)
      .innerJoin(users, eq(users.id, actividadGrupalEmpleados.employeeId))
      .where(eq(actividadGrupalEmpleados.activityId, activityId))
      .orderBy(asc(users.fullName));
  }

  private async findDiligenciamientoRow(activityId: string) {
    const [row] = await this.database.db
      .select({
        objectives: actividadGrupalDiligenciamientos.objectives,
        development: actividadGrupalDiligenciamientos.development,
        conclusion: actividadGrupalDiligenciamientos.conclusion,
        responsibleDepartment: actividadGrupalDiligenciamientos.responsibleDepartment,
        createdAt: actividadGrupalDiligenciamientos.createdAt,
        updatedAt: actividadGrupalDiligenciamientos.updatedAt,
      })
      .from(actividadGrupalDiligenciamientos)
      .where(eq(actividadGrupalDiligenciamientos.activityId, activityId))
      .limit(1);

    return row;
  }

  private async findSelectedIntegrantes(
    activityId: string,
  ): Promise<ActividadGrupalIntegranteOptionRecord[]> {
    const rows = await this.database.db
      .select({
        id: adultosMayores.id,
        documentNumber: adultosMayores.documentNumber,
        names: adultosMayores.names,
        surnames: adultosMayores.surnames,
      })
      .from(actividadGrupalDiligenciamientoIntegrantes)
      .innerJoin(
        adultosMayores,
        eq(adultosMayores.id, actividadGrupalDiligenciamientoIntegrantes.adultoMayorId),
      )
      .where(eq(actividadGrupalDiligenciamientoIntegrantes.activityId, activityId))
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names));

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
    }));
  }

  private async findSupportFiles(activityId: string): Promise<ActividadGrupalSupportFileRecord[]> {
    return await this.database.db
      .select({
        id: actividadGrupalDiligenciamientoFiles.id,
        activityId: actividadGrupalDiligenciamientoFiles.activityId,
        kind: actividadGrupalDiligenciamientoFiles.kind,
        originalName: actividadGrupalDiligenciamientoFiles.originalName,
        mimeType: actividadGrupalDiligenciamientoFiles.mimeType,
        sizeBytes: actividadGrupalDiligenciamientoFiles.sizeBytes,
        relativePath: actividadGrupalDiligenciamientoFiles.relativePath,
        createdAt: actividadGrupalDiligenciamientoFiles.createdAt,
      })
      .from(actividadGrupalDiligenciamientoFiles)
      .where(eq(actividadGrupalDiligenciamientoFiles.activityId, activityId))
      .orderBy(asc(actividadGrupalDiligenciamientoFiles.createdAt));
  }

  private getActivitySelection() {
    return {
      id: actividadesGrupales.id,
      tenantId: actividadesGrupales.tenantId,
      tenantName: tenants.name,
      createdByUserId: actividadesGrupales.createdByUserId,
      actaNumber: actividadesGrupales.actaNumber,
      actaOrganizer: actividadesGrupales.actaOrganizer,
      actaSequence: actividadesGrupales.actaSequence,
      previousActaNumber: actividadesGrupales.previousActaNumber,
      activityName: actividadesGrupales.activityName,
      activityType: actividadesGrupales.activityType,
      activityTypeId: actividadesGrupales.activityTypeId,
      activityTypeName: actividadGrupalTipos.name,
      activityTypeIsActive: actividadGrupalTipos.isActive,
      activityDate: actividadesGrupales.activityDate,
      startTime: actividadesGrupales.startTime,
      endTime: actividadesGrupales.endTime,
      organizer: actividadesGrupales.organizer,
      createdAt: actividadesGrupales.createdAt,
      updatedAt: actividadesGrupales.updatedAt,
    };
  }

  private getTrashActivitySelection() {
    return {
      ...this.getActivitySelection(),
      deletedAt: actividadesGrupales.deletedAt,
      deletedByUserId: actividadesGrupales.deletedByUserId,
      deletionReason: actividadesGrupales.deletionReason,
      deletedByUserFullName: users.fullName,
    };
  }

  private async findAssignedEmployeeIds(activityIds: string[]): Promise<Map<string, string[]>> {
    if (activityIds.length === 0) {
      return new Map();
    }

    const rows = await this.database.db
      .select({
        activityId: actividadGrupalEmpleados.activityId,
        employeeId: actividadGrupalEmpleados.employeeId,
      })
      .from(actividadGrupalEmpleados)
      .where(inArray(actividadGrupalEmpleados.activityId, activityIds));

    const assigned = new Map<string, string[]>();

    for (const row of rows) {
      const employeeIds = assigned.get(row.activityId) ?? [];
      employeeIds.push(row.employeeId);
      assigned.set(row.activityId, employeeIds);
    }

    return assigned;
  }

  private async findInvolvedEmployeeCounts(activityIds: string[]): Promise<Map<string, number>> {
    if (activityIds.length === 0) {
      return new Map();
    }

    const rows = await this.database.db
      .select({
        activityId: actividadGrupalEmpleados.activityId,
      })
      .from(actividadGrupalEmpleados)
      .where(inArray(actividadGrupalEmpleados.activityId, activityIds));

    const counts = new Map<string, number>();

    for (const row of rows) {
      counts.set(row.activityId, (counts.get(row.activityId) ?? 0) + 1);
    }

    return counts;
  }

  private buildWhere(query: FindActividadesGrupalesQuery): SQL | undefined {
    const conditions: SQL[] = [isNull(actividadesGrupales.deletedAt)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(actividadesGrupales.tenantId, query.scope.tenantId));
    } else if (query.tenantId !== null) {
      conditions.push(eq(actividadesGrupales.tenantId, query.tenantId));
    }

    if (query.activityType !== null) {
      conditions.push(eq(actividadesGrupales.activityType, query.activityType));
    }

    if (query.activityTypeId !== null) {
      conditions.push(eq(actividadesGrupales.activityTypeId, query.activityTypeId));
    }

    if (query.organizer !== null) {
      conditions.push(this.buildOrganizerFilterCondition(query.organizer));
    }

    if (query.permittedOrganizers !== null) {
      conditions.push(inArray(actividadesGrupales.organizer, [...query.permittedOrganizers]));
    }

    if (query.activityMonth !== null) {
      const monthRange = resolveMonthRange(query.activityMonth);

      conditions.push(
        gte(actividadesGrupales.activityDate, monthRange.startDate),
        lt(actividadesGrupales.activityDate, monthRange.endDateExclusive),
      );
    }

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;

      conditions.push(
        or(
          ilike(actividadesGrupales.activityName, searchPattern),
          ilike(actividadGrupalTipos.name, searchPattern),
          ilike(tenants.name, searchPattern),
          sql`${actividadesGrupales.actaNumber}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.previousActaNumber}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.activityType}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.organizer}::text ilike ${searchPattern}`,
        )!,
      );
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildTrashWhere(query: FindActividadesGrupalesTrashQuery): SQL | undefined {
    const conditions: SQL[] = [isNotNull(actividadesGrupales.deletedAt)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(actividadesGrupales.tenantId, query.scope.tenantId));
    } else if (query.tenantId !== null) {
      conditions.push(eq(actividadesGrupales.tenantId, query.tenantId));
    }

    if (query.activityType !== null) {
      conditions.push(eq(actividadesGrupales.activityType, query.activityType));
    }

    if (query.activityTypeId !== null) {
      conditions.push(eq(actividadesGrupales.activityTypeId, query.activityTypeId));
    }

    if (query.organizer !== null) {
      conditions.push(this.buildOrganizerFilterCondition(query.organizer));
    }

    if (query.permittedOrganizers !== null) {
      conditions.push(inArray(actividadesGrupales.organizer, [...query.permittedOrganizers]));
    }

    if (query.activityMonth !== null) {
      const monthRange = resolveMonthRange(query.activityMonth);

      conditions.push(
        gte(actividadesGrupales.activityDate, monthRange.startDate),
        lt(actividadesGrupales.activityDate, monthRange.endDateExclusive),
      );
    }

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;

      conditions.push(
        or(
          ilike(actividadesGrupales.activityName, searchPattern),
          ilike(actividadGrupalTipos.name, searchPattern),
          ilike(tenants.name, searchPattern),
          sql`${actividadesGrupales.actaNumber}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.previousActaNumber}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.activityType}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.organizer}::text ilike ${searchPattern}`,
          ilike(actividadesGrupales.deletionReason, searchPattern),
        )!,
      );
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildOrganizerFilterCondition(organizer: ActividadGrupalRecord["organizer"]): SQL {
    if (!usesSharedActividadGrupalActaSeries(organizer)) {
      return eq(actividadesGrupales.organizer, organizer);
    }

    return eq(actividadesGrupales.actaOrganizer, resolveActividadGrupalActaOrganizer(organizer));
  }

  private buildActivityScopedWhere(query: FindActividadGrupalByIdQuery, extra: SQL[]) {
    const conditions = [...extra, isNull(actividadesGrupales.deletedAt)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(actividadesGrupales.tenantId, query.scope.tenantId));
    }

    if (query.permittedOrganizers !== null) {
      conditions.push(inArray(actividadesGrupales.organizer, [...query.permittedOrganizers]));
    }

    return and(...conditions);
  }

  private buildTrashActivityScopedWhere(query: FindActividadGrupalByIdQuery, extra: SQL[]) {
    const conditions = [...extra, isNotNull(actividadesGrupales.deletedAt)];

    if (query.scope.type === "tenant") {
      conditions.push(eq(actividadesGrupales.tenantId, query.scope.tenantId));
    }

    if (query.permittedOrganizers !== null) {
      conditions.push(inArray(actividadesGrupales.organizer, [...query.permittedOrganizers]));
    }

    return and(...conditions);
  }
}

type ActaCorrectionSourceRow = {
  id: string;
  activityDate: string;
  startTime: string;
  endTime: string;
  organizer: ActividadGrupalRecord["organizer"];
  actaNumber: string;
  actaSeriesKey?: string;
  actaOrganizer: ActividadGrupalRecord["actaOrganizer"];
  actaSequence: number;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
};

type ActaCorrectionFinalStateRow = Pick<
  ActaCorrectionSourceRow,
  "id" | "actaNumber" | "actaSeriesKey" | "actaOrganizer" | "actaSequence"
>;

type TemporaryCorrectionRow = {
  id: string;
  actaSeriesKey: string;
  actaOrganizer: ActividadGrupalRecord["actaOrganizer"];
  temporaryActaNumber: string;
  temporaryActaSequence: number;
};

const POSTGRES_INTEGER_MAX = 2_147_483_647;

export function buildCorrectionPreviewRows(
  rows: ActaCorrectionSourceRow[],
): ActaCorrectionPreviewRow[] {
  const sequenceByOrganizer = new Map<ActividadGrupalRecord["actaOrganizer"], number>();

  return rows.map((row) => {
    const actaOrganizer = resolveActividadGrupalActaOrganizer(row.organizer);
    const sequence = (sequenceByOrganizer.get(actaOrganizer) ?? 0) + 1;
    sequenceByOrganizer.set(actaOrganizer, sequence);

    return {
      activityId: row.id,
      activityDate: row.activityDate,
      startTime: row.startTime,
      endTime: row.endTime,
      organizer: row.organizer,
      currentActaNumber: row.actaNumber,
      proposedActaNumber: formatActividadGrupalActaNumber(actaOrganizer, sequence),
      sequence,
      isDeleted: row.deletedAt !== null,
    };
  });
}

export function buildPrefixCorrectionPreviewRows(
  rows: ActaCorrectionSourceRow[],
  prefix: string,
): ActaCorrectionPreviewRow[] {
  return rows.map((row, index) => {
    const sequence = index + 1;
    return {
      activityId: row.id,
      activityDate: row.activityDate,
      startTime: row.startTime,
      endTime: row.endTime,
      organizer: row.organizer,
      currentActaNumber: row.actaNumber,
      proposedActaNumber: `${prefix}-${String(sequence).padStart(3, "0")}`,
      sequence,
      isDeleted: row.deletedAt !== null,
    };
  });
}

export function countScheduleWarnings(rows: readonly ActaCorrectionPreviewRow[]): number {
  const warningIds = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    if (current === undefined) continue;

    for (let nextIndex = index + 1; nextIndex < rows.length; nextIndex += 1) {
      const next = rows[nextIndex];
      if (next === undefined || next.activityDate !== current.activityDate) continue;
      if (next.startTime >= current.endTime) break;

      if (current.startTime < next.endTime && next.startTime < current.endTime) {
        warningIds.add(current.activityId);
        warningIds.add(next.activityId);
      }
    }
  }

  return warningIds.size;
}

export function hashCorrectionSnapshot(rows: ActaCorrectionSourceRow[]): string {
  const snapshot = rows.map((row) => [
    row.id,
    row.activityDate,
    row.startTime,
    row.endTime,
    row.organizer,
    row.actaNumber,
    row.actaSeriesKey ?? null,
    row.actaSequence,
    row.createdAt.toISOString(),
    row.updatedAt.toISOString(),
    row.deletedAt?.toISOString() ?? null,
  ]);

  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

function hasCorrectionTargetChanged(
  sourceRow: ActaCorrectionSourceRow | undefined,
  targetRow: ActaCorrectionPreviewRow,
): boolean {
  if (sourceRow === undefined) {
    throw new ActaCorrectionConflictError("La vista previa ya no coincide con las actas activas.");
  }

  return (
    sourceRow.actaNumber !== targetRow.proposedActaNumber ||
    sourceRow.actaOrganizer !== resolveActividadGrupalActaOrganizer(targetRow.organizer) ||
    sourceRow.actaSequence !== targetRow.sequence
  );
}

export function assertCorrectionFinalStateIsUnique(
  activeRows: ActaCorrectionFinalStateRow[],
  targetRows: ActaCorrectionPreviewRow[],
  targetSeriesKey?: string,
): void {
  const targetById = new Map(targetRows.map((row) => [row.activityId, row]));
  const actaNumbers = new Set<string>();
  const actaSeries = new Set<string>();

  for (const row of activeRows) {
    const target = targetById.get(row.id);
    const actaNumber = target?.proposedActaNumber ?? row.actaNumber;
    const actaOrganizer =
      target === undefined
        ? row.actaOrganizer
        : resolveActividadGrupalActaOrganizer(target.organizer);
    const actaSequence = target?.sequence ?? row.actaSequence;
    const seriesKey =
      target === undefined
        ? (row.actaSeriesKey ?? "legacy:" + row.actaOrganizer)
        : (targetSeriesKey ?? row.actaSeriesKey ?? "legacy:" + actaOrganizer);
    const seriesIdentity = seriesKey + "\u0000" + actaSequence;

    if (actaNumbers.has(actaNumber)) {
      throw new ActaCorrectionConflictError(
        "La normalizacion produciria una acta duplicada (" +
          actaNumber +
          ") entre actas activas del centro.",
      );
    }

    if (actaSeries.has(seriesIdentity)) {
      throw new ActaCorrectionConflictError(
        "La normalizacion produciria una secuencia duplicada para " +
          seriesKey +
          " (" +
          actaSequence +
          ").",
      );
    }

    actaNumbers.add(actaNumber);
    actaSeries.add(seriesIdentity);
  }
}

export function buildTemporaryCorrectionRows({
  operationId,
  activeRows,
  changedRows,
  targetSeriesKey,
}: {
  operationId: string;
  activeRows: ActaCorrectionFinalStateRow[];
  changedRows: ActaCorrectionPreviewRow[];
  targetSeriesKey?: string;
}): TemporaryCorrectionRow[] {
  const maxSequenceBySeries = new Map<string, number>();
  const changedCountBySeries = new Map<string, number>();

  for (const row of activeRows) {
    const seriesKey = row.actaSeriesKey ?? "legacy:" + row.actaOrganizer;
    maxSequenceBySeries.set(
      seriesKey,
      Math.max(maxSequenceBySeries.get(seriesKey) ?? 0, row.actaSequence),
    );
  }

  for (const row of changedRows) {
    const actaOrganizer = resolveActividadGrupalActaOrganizer(row.organizer);
    const seriesKey = targetSeriesKey ?? "legacy:" + actaOrganizer;
    changedCountBySeries.set(seriesKey, (changedCountBySeries.get(seriesKey) ?? 0) + 1);
  }

  for (const [seriesKey, changedCount] of changedCountBySeries) {
    const maxSequence = maxSequenceBySeries.get(seriesKey) ?? 0;
    if (maxSequence > POSTGRES_INTEGER_MAX - changedCount) {
      throw new ActaCorrectionConflictError(
        "No hay secuencias temporales disponibles para " +
          seriesKey +
          " sin exceder el limite de PostgreSQL.",
      );
    }
  }

  const usedActaNumbers = new Set(activeRows.map((row) => row.actaNumber));
  const nextTemporarySequenceBySeries = new Map(maxSequenceBySeries);

  return changedRows.map((row, index) => {
    const temporaryActaNumber = buildUniqueTemporaryActaNumber({
      operationId,
      index,
      usedActaNumbers,
    });
    const actaOrganizer = resolveActividadGrupalActaOrganizer(row.organizer);
    const actaSeriesKey = targetSeriesKey ?? "legacy:" + actaOrganizer;
    const temporaryActaSequence = (nextTemporarySequenceBySeries.get(actaSeriesKey) ?? 0) + 1;
    nextTemporarySequenceBySeries.set(actaSeriesKey, temporaryActaSequence);

    return {
      id: row.activityId,
      actaSeriesKey,
      actaOrganizer,
      temporaryActaNumber,
      temporaryActaSequence,
    };
  });
}

function buildUniqueTemporaryActaNumber({
  operationId,
  index,
  usedActaNumbers,
}: {
  operationId: string;
  index: number;
  usedActaNumbers: Set<string>;
}): string {
  const operationFragment = operationId.replaceAll("-", "").slice(0, 20);

  for (let attempt = 0; ; attempt += 1) {
    const candidate = `TMP-${operationFragment}-${index.toString(36)}-${attempt.toString(36)}`;
    if (candidate.length > 40) {
      throw new ActaCorrectionConflictError(
        "No fue posible generar un numero temporal de acta valido.",
      );
    }

    if (!usedActaNumbers.has(candidate)) {
      usedActaNumbers.add(candidate);
      return candidate;
    }
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function resolveMonthRange(period: string): {
  startDate: string;
  endDateExclusive: string;
} {
  const [yearValue, monthValue] = period.split("-");

  if (yearValue === undefined || monthValue === undefined) {
    throw new Error("period invalido.");
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
