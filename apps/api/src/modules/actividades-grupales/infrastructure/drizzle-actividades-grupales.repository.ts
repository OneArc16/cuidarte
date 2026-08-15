import { Injectable } from "@nestjs/common";
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  sql,
  type SQL,
} from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  actividadGrupalActaCounters,
  actividadGrupalDiligenciamientoFiles,
  actividadGrupalDiligenciamientoIntegrantes,
  actividadGrupalDiligenciamientos,
  actividadGrupalEmpleados,
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
  type ActividadGrupalTrashRecord,
  type ActividadGrupalSupportFileRecord,
  type ActividadGrupalTenantOptionRecord,
  type CreateActividadGrupalRecordCommand,
  type DeleteActividadGrupalRecordCommand,
  type FindActividadesGrupalesQuery,
  type FindActividadesGrupalesTrashQuery,
  type FindActividadGrupalByIdQuery,
  type RestoreActividadGrupalRecordCommand,
  type SaveActividadGrupalDiligenciamientoRecordCommand,
  type SavedActividadGrupalDiligenciamientoRecord,
  type SearchActividadGrupalIntegrantesOptionsQuery,
  type UpdateActividadGrupalRecordCommand,
} from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

type ActividadGrupalSelectionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  createdByUserId: string;
  actaNumber: string;
  activityName: string;
  activityType: ActividadGrupalRecord["activityType"];
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
      .where(this.buildWhere(query))
      .orderBy(desc(actividadesGrupales.activityDate), desc(actividadesGrupales.actaNumber));

    const countByActivityId = await this.findInvolvedEmployeeCounts(rows.map((row) => row.id));

    return rows.map((row) => ({
      ...row,
      involvedEmployeesCount: countByActivityId.get(row.id) ?? 0,
    }));
  }

  async findTrashMany(query: FindActividadesGrupalesTrashQuery): Promise<ActividadGrupalTrashRecord[]> {
    const rows = await this.database.db
      .select(this.getTrashActivitySelection())
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
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
      activityName: row.activityName,
      activityType: row.activityType,
      activityDate: row.activityDate,
      startTime: row.startTime,
      endTime: row.endTime,
      organizer: row.organizer,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt!,
      deletedByUserId: row.deletedByUserId!,
      deletedByUserFullName: row.deletedByUserFullName,
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
      .where(
        this.buildActivityScopedWhere(query.scope, [eq(actividadesGrupales.id, query.activityId)]),
      )
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

  async findTrashById(query: FindActividadGrupalByIdQuery): Promise<ActividadGrupalTrashRecord | null> {
    const [activityRow] = await this.database.db
      .select(this.getTrashActivitySelection())
      .from(actividadesGrupales)
      .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
      .innerJoin(users, eq(users.id, actividadesGrupales.deletedByUserId))
      .where(
        this.buildTrashActivityScopedWhere(query.scope, [eq(actividadesGrupales.id, query.activityId)]),
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
    const conditions: SQL[] = [eq(adultosMayores.tenantId, query.tenantId)];

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
      })
      .from(adultosMayores)
      .where(and(...conditions))
      .orderBy(asc(adultosMayores.surnames), asc(adultosMayores.names))
      .limit(12);

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
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
      })
      .from(adultosMayores)
      .where(and(eq(adultosMayores.tenantId, tenantId), inArray(adultosMayores.id, integranteIds)));

    return rows.map((row) => ({
      id: row.id,
      documentNumber: row.documentNumber,
      fullName: `${row.names} ${row.surnames}`.trim(),
    }));
  }

  async getNextActaNumber(tenantId: string): Promise<number> {
    const [counter] = await this.database.db
      .select({
        lastValue: actividadGrupalActaCounters.lastValue,
      })
      .from(actividadGrupalActaCounters)
      .where(eq(actividadGrupalActaCounters.tenantId, tenantId))
      .limit(1);

    return (counter?.lastValue ?? 0) + 1;
  }

  async create(command: CreateActividadGrupalRecordCommand): Promise<ActividadGrupalRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [counter] = await tx
        .insert(actividadGrupalActaCounters)
        .values({
          tenantId: command.tenantId,
          lastValue: 1,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: actividadGrupalActaCounters.tenantId,
          set: {
            lastValue: sql`${actividadGrupalActaCounters.lastValue} + 1`,
            updatedAt: now,
          },
        })
        .returning({
          lastValue: actividadGrupalActaCounters.lastValue,
        });

      if (counter === undefined) {
        throw new Error("No fue posible generar el consecutivo del acta.");
      }

      const [created] = await tx
        .insert(actividadesGrupales)
        .values({
          tenantId: command.tenantId,
          actaNumber: command.actaNumber.trim(),
          activityName: command.activityName,
          activityType: command.activityType,
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
        summary: `Actividad grupal creada #${command.actaNumber.trim()}: ${command.activityName}`,
        metadata: {
          actaNumber: command.actaNumber.trim(),
          suggestedActaNumber: counter.lastValue,
          activityType: command.activityType,
          organizer: command.organizer,
          involvedEmployeesCount: command.employeeIds.length,
        },
      });

      const [row] = await tx
        .select(this.getActivitySelection())
        .from(actividadesGrupales)
        .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
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
          actaNumber: command.actaNumber.trim(),
          activityName: command.activityName,
          activityType: command.activityType,
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
        summary: `Actividad grupal actualizada #${command.actaNumber.trim()}: ${command.activityName}`,
        metadata: {
          activityId: command.activityId,
          actaNumber: command.actaNumber.trim(),
          activityType: command.activityType,
          organizer: command.organizer,
          involvedEmployeesCount: command.employeeIds.length,
        },
      });

      const [row] = await tx
        .select(this.getActivitySelection())
        .from(actividadesGrupales)
        .innerJoin(tenants, eq(tenants.id, actividadesGrupales.tenantId))
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
        action: "actividades-grupales.moved-to-trash",
        targetTenantId: activity.tenantId,
        summary: `Acta enviada a la papelera #${activity.actaNumber}: ${activity.activityName}`,
        metadata: {
          activityId: command.activityId,
          actaNumber: activity.actaNumber,
        },
      });

      await tx
        .update(actividadesGrupales)
        .set({
          deletedAt: now,
          deletedByUserId: command.actorUserId,
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

  async restore(command: RestoreActividadGrupalRecordCommand): Promise<boolean> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [restored] = await tx
        .update(actividadesGrupales)
        .set({
          deletedAt: null,
          deletedByUserId: null,
          updatedAt: now,
        })
        .where(and(eq(actividadesGrupales.id, command.activityId), isNotNull(actividadesGrupales.deletedAt)))
        .returning({
          tenantId: actividadesGrupales.tenantId,
          actaNumber: actividadesGrupales.actaNumber,
          activityName: actividadesGrupales.activityName,
        });

      if (restored === undefined) {
        return false;
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.restored",
        targetTenantId: restored.tenantId,
        summary: `Acta restaurada #${restored.actaNumber}: ${restored.activityName}`,
        metadata: {
          activityId: command.activityId,
          actaNumber: restored.actaNumber,
        },
      });

      return true;
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

      await tx.insert(actividadGrupalDiligenciamientoIntegrantes).values(
        command.integranteIds.map((integranteId) => ({
          activityId: command.activityId,
          adultoMayorId: integranteId,
        })),
      );

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
      activityName: actividadesGrupales.activityName,
      activityType: actividadesGrupales.activityType,
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
      deletedByUserFullName: users.fullName,
    };
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

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;

      conditions.push(
        or(
          ilike(actividadesGrupales.activityName, searchPattern),
          ilike(tenants.name, searchPattern),
          sql`${actividadesGrupales.actaNumber}::text ilike ${searchPattern}`,
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

    if (query.search !== null) {
      const searchPattern = `%${escapeLikePattern(query.search)}%`;

      conditions.push(
        or(
          ilike(actividadesGrupales.activityName, searchPattern),
          ilike(tenants.name, searchPattern),
          sql`${actividadesGrupales.actaNumber}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.activityType}::text ilike ${searchPattern}`,
          sql`${actividadesGrupales.organizer}::text ilike ${searchPattern}`,
        )!,
      );
    }

    return conditions.length === 0 ? undefined : and(...conditions);
  }

  private buildActivityScopedWhere(scope: FindActividadGrupalByIdQuery["scope"], extra: SQL[]) {
    const conditions = [...extra, isNull(actividadesGrupales.deletedAt)];

    if (scope.type === "tenant") {
      conditions.push(eq(actividadesGrupales.tenantId, scope.tenantId));
    }

    return and(...conditions);
  }

  private buildTrashActivityScopedWhere(
    scope: FindActividadGrupalByIdQuery["scope"],
    extra: SQL[],
  ) {
    const conditions = [...extra, isNotNull(actividadesGrupales.deletedAt)];

    if (scope.type === "tenant") {
      conditions.push(eq(actividadesGrupales.tenantId, scope.tenantId));
    }

    return and(...conditions);
  }
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
