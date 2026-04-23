import { Injectable } from "@nestjs/common";
import { and, asc, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import {
  actividadGrupalActaCounters,
  actividadGrupalEmpleados,
  actividadesGrupales,
  auditLogs,
  tenants,
  users,
} from "../../../database/schema";
import {
  type ActividadGrupalEmpleadoOptionRecord,
  type ActividadGrupalRecord,
  type ActividadGrupalTenantOptionRecord,
  type CreateActividadGrupalRecordCommand,
  type FindActividadesGrupalesQuery,
} from "../domain/actividad-grupal.types";
import { type ActividadesGrupalesRepository } from "../domain/actividades-grupales.repository";

type ActividadGrupalSelectionRow = {
  id: string;
  tenantId: string;
  tenantName: string;
  actaNumber: number;
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
      .select(this.getSelection())
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
          actaNumber: counter.lastValue,
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
        summary: `Actividad grupal creada #${counter.lastValue}: ${command.activityName}`,
        metadata: {
          actaNumber: counter.lastValue,
          activityType: command.activityType,
          organizer: command.organizer,
          involvedEmployeesCount: command.employeeIds.length,
        },
      });

      const [row] = await tx
        .select(this.getSelection())
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

  private getSelection() {
    return {
      id: actividadesGrupales.id,
      tenantId: actividadesGrupales.tenantId,
      tenantName: tenants.name,
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
    const conditions: SQL[] = [];

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
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}
