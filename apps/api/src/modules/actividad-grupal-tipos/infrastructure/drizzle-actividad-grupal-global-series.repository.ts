import { Injectable } from "@nestjs/common";
import { count } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { actividadGrupalGlobalSeries, auditLogs, tenants } from "../../../database/schema";
import { type ActividadGrupalGlobalSeriesRepository } from "../domain/actividad-grupal-global-series.repository";
import {
  type ActividadGrupalGlobalSeriesRecord,
  type UpdateActividadGrupalGlobalSeriesCommand,
} from "../domain/actividad-grupal-global-series.types";

@Injectable()
export class DrizzleActividadGrupalGlobalSeriesRepository implements ActividadGrupalGlobalSeriesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findGlobalSeries(): Promise<ActividadGrupalGlobalSeriesRecord> {
    const [config] = await this.database.db
      .select({
        enabled: actividadGrupalGlobalSeries.enabled,
        prefix: actividadGrupalGlobalSeries.prefix,
        updatedAt: actividadGrupalGlobalSeries.updatedAt,
      })
      .from(actividadGrupalGlobalSeries)
      .limit(1);
    const [tenantSummary] = await this.database.db.select({ tenantCount: count() }).from(tenants);

    return {
      enabled: config?.enabled ?? false,
      prefix: config?.prefix ?? null,
      tenantCount: Number(tenantSummary?.tenantCount ?? 0),
      updatedAt: config?.updatedAt ?? null,
    };
  }

  async updateGlobalSeries(
    command: UpdateActividadGrupalGlobalSeriesCommand,
  ): Promise<ActividadGrupalGlobalSeriesRecord> {
    return await this.database.db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx
        .insert(actividadGrupalGlobalSeries)
        .values({
          id: 1,
          enabled: command.enabled,
          prefix: command.prefix,
          updatedByUserId: command.actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: actividadGrupalGlobalSeries.id,
          set: {
            enabled: command.enabled,
            prefix: command.prefix,
            updatedByUserId: command.actorUserId,
            updatedAt: now,
          },
        })
        .returning({
          enabled: actividadGrupalGlobalSeries.enabled,
          prefix: actividadGrupalGlobalSeries.prefix,
          updatedAt: actividadGrupalGlobalSeries.updatedAt,
        });

      if (updated === undefined) {
        throw new Error("No fue posible actualizar la serie global.");
      }

      await tx.insert(auditLogs).values({
        actorUserId: command.actorUserId,
        action: "actividades-grupales.global-series.updated",
        targetTenantId: null,
        summary: command.enabled
          ? `Serie global activada con prefijo ${command.prefix}`
          : "Serie global desactivada",
        metadata: {
          enabled: command.enabled,
          prefix: command.prefix,
          scope: "all-tenants",
        },
      });

      const [tenantSummary] = await tx.select({ tenantCount: count() }).from(tenants);

      return {
        enabled: updated.enabled,
        prefix: updated.prefix,
        tenantCount: Number(tenantSummary?.tenantCount ?? 0),
        updatedAt: updated.updatedAt,
      };
    });
  }
}
