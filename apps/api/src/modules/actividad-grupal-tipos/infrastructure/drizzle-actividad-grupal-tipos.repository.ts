import { Injectable } from "@nestjs/common";
import { and, asc, eq, isNull, or } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { actividadGrupalTipos, auditLogs, users } from "../../../database/schema";
import {
  type ActividadGrupalTipoRecord,
  type CreateActividadGrupalTipoCommand,
  type FindActividadGrupalTiposQuery,
  type UpdateActividadGrupalTipoCommand,
  type UpdateActividadGrupalTipoStatusCommand,
  type UpdateActividadGrupalTipoConsecutiveConfigCommand,
} from "../domain/actividad-grupal-tipo.types";
import { type ActividadGrupalTiposRepository } from "../domain/actividad-grupal-tipos.repository";

@Injectable()
export class DrizzleActividadGrupalTiposRepository implements ActividadGrupalTiposRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(query: FindActividadGrupalTiposQuery): Promise<ActividadGrupalTipoRecord[]> {
    const conditions =
      query.tenantId === null ? [] : [eq(actividadGrupalTipos.tenantId, query.tenantId)];

    if (!query.includeInactive) {
      conditions.push(eq(actividadGrupalTipos.isActive, true));
    }

    const baseQuery = this.database.db.select(this.getSelection()).from(actividadGrupalTipos);

    if (conditions.length === 0) {
      return await baseQuery.orderBy(asc(actividadGrupalTipos.name));
    }

    return await baseQuery.where(and(...conditions)).orderBy(asc(actividadGrupalTipos.name));
  }

  async findById(id: string): Promise<ActividadGrupalTipoRecord | null> {
    const [row] = await this.database.db
      .select(this.getSelection())
      .from(actividadGrupalTipos)
      .where(eq(actividadGrupalTipos.id, id))
      .limit(1);

    return row ?? null;
  }

  async findByTenantAndNormalizedName(
    tenantId: string,
    normalizedName: string,
  ): Promise<ActividadGrupalTipoRecord | null> {
    const [row] = await this.database.db
      .select(this.getSelection())
      .from(actividadGrupalTipos)
      .where(
        and(
          eq(actividadGrupalTipos.tenantId, tenantId),
          eq(actividadGrupalTipos.normalizedName, normalizedName),
        ),
      )
      .limit(1);

    return row ?? null;
  }

  async create(command: CreateActividadGrupalTipoCommand): Promise<ActividadGrupalTipoRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [created] = await tx
        .insert(actividadGrupalTipos)
        .values({
          tenantId: command.tenantId,
          name: command.name,
          normalizedName: command.normalizedName,
          createdByUserId: command.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning(this.getSelection());

      if (created === undefined) {
        throw new Error("No fue posible crear el tipo de actividad grupal.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.tipo.created",
        targetTenantId: command.tenantId,
        summary: `Tipo de actividad grupal creado: ${command.name}`,
        metadata: {
          activityTypeId: created.id,
          name: command.name,
          isActive: true,
        },
      });

      return created;
    });
  }

  async update(command: UpdateActividadGrupalTipoCommand): Promise<ActividadGrupalTipoRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(actividadGrupalTipos)
        .set({
          name: command.name,
          normalizedName: command.normalizedName,
          updatedAt: now,
        })
        .where(eq(actividadGrupalTipos.id, command.id))
        .returning(this.getSelection());

      if (updated === undefined) {
        throw new Error("No fue posible actualizar el tipo de actividad grupal.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.tipo.updated",
        targetTenantId: updated.tenantId,
        summary: `Tipo de actividad grupal actualizado: ${command.name}`,
        metadata: {
          activityTypeId: updated.id,
          name: command.name,
        },
      });

      return updated;
    });
  }

  async updateStatus(
    command: UpdateActividadGrupalTipoStatusCommand,
  ): Promise<ActividadGrupalTipoRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(actividadGrupalTipos)
        .set({
          isActive: command.isActive,
          updatedAt: now,
          deactivatedAt: command.isActive ? null : now,
          deactivatedByUserId: command.isActive ? null : command.actorUserId,
        })
        .where(eq(actividadGrupalTipos.id, command.id))
        .returning(this.getSelection());

      if (updated === undefined) {
        throw new Error("No fue posible actualizar el estado del tipo de actividad grupal.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: command.isActive
          ? "actividades-grupales.tipo.activated"
          : "actividades-grupales.tipo.deactivated",
        targetTenantId: updated.tenantId,
        summary: `Tipo de actividad grupal ${command.isActive ? "activado" : "desactivado"}: ${updated.name}`,
        metadata: {
          activityTypeId: updated.id,
          name: updated.name,
          isActive: command.isActive,
        },
      });

      return updated;
    });
  }

  async updateConsecutiveConfig(
    command: UpdateActividadGrupalTipoConsecutiveConfigCommand,
  ): Promise<ActividadGrupalTipoRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .update(actividadGrupalTipos)
        .set({
          consecutivePrefix: command.prefix,
          consecutiveNextValue: command.nextValue,
          consecutiveCreatorUserIds:
            command.creatorUserIds as (typeof actividadGrupalTipos.$inferInsert)["consecutiveCreatorUserIds"],
          updatedAt: now,
        })
        .where(eq(actividadGrupalTipos.id, command.id))
        .returning(this.getSelection());

      if (updated === undefined) {
        throw new Error("No fue posible actualizar el consecutivo de la actividad grupal.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.tipo.consecutive-configured",
        targetTenantId: updated.tenantId,
        summary: "Consecutivo configurado para actividad grupal",
        metadata: {
          activityTypeId: updated.id,
          prefix: command.prefix,
          nextValue: command.nextValue,
          creatorUserIds: command.creatorUserIds,
        },
      });

      return updated;
    });
  }

  async findCreatorOptions(tenantId: string) {
    return await this.database.db
      .select({
        id: users.id,
        fullName: users.fullName,
        role: users.role,
      })
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          or(
            eq(users.tenantId, tenantId),
            and(isNull(users.tenantId), eq(users.role, "super_admin")),
          ),
        ),
      )
      .orderBy(asc(users.fullName));
  }

  private getSelection() {
    return {
      id: actividadGrupalTipos.id,
      tenantId: actividadGrupalTipos.tenantId,
      name: actividadGrupalTipos.name,
      normalizedName: actividadGrupalTipos.normalizedName,
      consecutivePrefix: actividadGrupalTipos.consecutivePrefix,
      consecutiveNextValue: actividadGrupalTipos.consecutiveNextValue,
      consecutiveCreatorUserIds: actividadGrupalTipos.consecutiveCreatorUserIds,
      isActive: actividadGrupalTipos.isActive,
      createdAt: actividadGrupalTipos.createdAt,
      updatedAt: actividadGrupalTipos.updatedAt,
      deactivatedAt: actividadGrupalTipos.deactivatedAt,
    };
  }
}
