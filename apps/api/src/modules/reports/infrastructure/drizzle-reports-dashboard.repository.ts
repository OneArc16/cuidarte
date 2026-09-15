import { Injectable } from "@nestjs/common";
import { and, asc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";

import { DatabaseService } from "../../../database/database.service";
import {
  actividadGrupalTipos,
  actividadesGrupales,
  alimentacionRegistros,
  atencionesEnfermeria,
  atencionesIndividuales,
  tenants,
  users,
} from "../../../database/schema";
import { type ReportsDashboardRepository } from "../domain/reports-dashboard.repository";
import {
  type ReportsDashboardAggregate,
  type ReportsDashboardDailyAggregate,
  type ReportsDashboardQuery,
  type ReportsDashboardScope,
} from "../domain/reports-dashboard.types";

@Injectable()
export class DrizzleReportsDashboardRepository implements ReportsDashboardRepository {
  constructor(private readonly database: DatabaseService) {}

  async aggregate(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ): Promise<ReportsDashboardAggregate> {
    const [nursingRows, medicalRows, activityRows, foodRows, activityTypeRows, tenantRow] =
      await Promise.all([
        this.aggregateNursing(query),
        this.aggregateMedical(query),
        this.aggregateActivities(query),
        this.aggregateFood(query),
        this.aggregateActivitiesByType(query),
        this.findTenant(query.scope),
      ]);

    const dailySeries = mergeDailyAggregates(nursingRows, medicalRows, activityRows, foodRows);

    return {
      tenantName: tenantRow?.name ?? null,
      dailySeries,
      activitiesByType: activityTypeRows,
      snackOneDelivered: foodRows.reduce((total, row) => total + row.snackOneDelivered, 0),
      snackTwoDelivered: foodRows.reduce((total, row) => total + row.snackTwoDelivered, 0),
    };
  }

  private async aggregateNursing(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ): Promise<Array<{ date: string; count: number }>> {
    const rows = await this.database.db
      .select({ date: atencionesEnfermeria.attentionDate, count: sql<number>`count(*)::int` })
      .from(atencionesEnfermeria)
      .where(
        and(
          ...tenantCondition(atencionesEnfermeria.tenantId, query.scope),
          isNull(atencionesEnfermeria.deletedAt),
          gte(atencionesEnfermeria.attentionDate, query.from),
          lte(atencionesEnfermeria.attentionDate, query.to),
        ),
      )
      .groupBy(atencionesEnfermeria.attentionDate)
      .orderBy(asc(atencionesEnfermeria.attentionDate));

    return rows;
  }

  private async aggregateMedical(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ): Promise<Array<{ date: string; count: number }>> {
    const rows = await this.database.db
      .select({ date: atencionesIndividuales.attentionDate, count: sql<number>`count(*)::int` })
      .from(atencionesIndividuales)
      .innerJoin(users, eq(users.id, atencionesIndividuales.createdByUserId))
      .where(
        and(
          ...tenantCondition(atencionesIndividuales.tenantId, query.scope),
          eq(users.role, "medico"),
          gte(atencionesIndividuales.attentionDate, query.from),
          lte(atencionesIndividuales.attentionDate, query.to),
        ),
      )
      .groupBy(atencionesIndividuales.attentionDate)
      .orderBy(asc(atencionesIndividuales.attentionDate));

    return rows;
  }

  private async aggregateActivities(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ): Promise<Array<{ date: string; count: number }>> {
    const rows = await this.database.db
      .select({ date: actividadesGrupales.activityDate, count: sql<number>`count(*)::int` })
      .from(actividadesGrupales)
      .where(
        and(
          ...tenantCondition(actividadesGrupales.tenantId, query.scope),
          isNull(actividadesGrupales.deletedAt),
          gte(actividadesGrupales.activityDate, query.from),
          lte(actividadesGrupales.activityDate, query.to),
        ),
      )
      .groupBy(actividadesGrupales.activityDate)
      .orderBy(asc(actividadesGrupales.activityDate));

    return rows;
  }

  private async aggregateFood(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ): Promise<FoodDailyAggregate[]> {
    const rows = await this.database.db
      .select({
        date: alimentacionRegistros.deliveryDate,
        transportAllowancesDelivered: sql<number>`count(*) filter (where ${alimentacionRegistros.auxilioTransporte} = 'entregado')::int`,
        snacksDelivered: sql<number>`(
          count(*) filter (where ${alimentacionRegistros.refrigerio1} = 'entregado') +
          count(*) filter (where ${alimentacionRegistros.refrigerio2} = 'entregado')
        )::int`,
        snackOneDelivered: sql<number>`count(*) filter (where ${alimentacionRegistros.refrigerio1} = 'entregado')::int`,
        snackTwoDelivered: sql<number>`count(*) filter (where ${alimentacionRegistros.refrigerio2} = 'entregado')::int`,
        lunchesDelivered: sql<number>`count(*) filter (where ${alimentacionRegistros.almuerzo} = 'entregado')::int`,
      })
      .from(alimentacionRegistros)
      .where(
        and(
          ...tenantCondition(alimentacionRegistros.tenantId, query.scope),
          gte(alimentacionRegistros.deliveryDate, query.from),
          lte(alimentacionRegistros.deliveryDate, query.to),
        ),
      )
      .groupBy(alimentacionRegistros.deliveryDate)
      .orderBy(asc(alimentacionRegistros.deliveryDate));

    return rows;
  }

  private async aggregateActivitiesByType(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ) {
    return await this.database.db
      .select({
        activityTypeId: actividadGrupalTipos.id,
        activityTypeName: actividadGrupalTipos.name,
        count: sql<number>`count(*)::int`,
      })
      .from(actividadesGrupales)
      .innerJoin(
        actividadGrupalTipos,
        eq(actividadGrupalTipos.id, actividadesGrupales.activityTypeId),
      )
      .where(
        and(
          ...tenantCondition(actividadesGrupales.tenantId, query.scope),
          isNull(actividadesGrupales.deletedAt),
          gte(actividadesGrupales.activityDate, query.from),
          lte(actividadesGrupales.activityDate, query.to),
        ),
      )
      .groupBy(actividadGrupalTipos.id, actividadGrupalTipos.name)
      .orderBy(asc(actividadGrupalTipos.name));
  }

  private async findTenant(scope: ReportsDashboardScope) {
    if (scope.tenantId === null) {
      return null;
    }

    const [row] = await this.database.db
      .select({ name: tenants.name })
      .from(tenants)
      .where(and(eq(tenants.id, scope.tenantId), eq(tenants.isActive, true)))
      .limit(1);

    return row ?? null;
  }
}

type FoodDailyAggregate = {
  date: string;
  transportAllowancesDelivered: number;
  snacksDelivered: number;
  snackOneDelivered: number;
  snackTwoDelivered: number;
  lunchesDelivered: number;
};

function tenantCondition(tenantColumn: AnyPgColumn, scope: ReportsDashboardScope) {
  return scope.tenantId === null ? [] : [eq(tenantColumn, scope.tenantId)];
}

function mergeDailyAggregates(
  nursingRows: Array<{ date: string; count: number }>,
  medicalRows: Array<{ date: string; count: number }>,
  activityRows: Array<{ date: string; count: number }>,
  foodRows: FoodDailyAggregate[],
): ReportsDashboardDailyAggregate[] {
  const byDate = new Map<string, ReportsDashboardDailyAggregate>();
  const getOrCreate = (date: string) => {
    const existing = byDate.get(date);
    if (existing !== undefined) {
      return existing;
    }

    const created: ReportsDashboardDailyAggregate = {
      date,
      nursingAttendances: 0,
      medicalAttendances: 0,
      activities: 0,
      transportAllowancesDelivered: 0,
      snacksDelivered: 0,
      lunchesDelivered: 0,
    };
    byDate.set(date, created);
    return created;
  };

  for (const row of nursingRows) getOrCreate(row.date).nursingAttendances = row.count;
  for (const row of medicalRows) getOrCreate(row.date).medicalAttendances = row.count;
  for (const row of activityRows) getOrCreate(row.date).activities = row.count;
  for (const row of foodRows) {
    const point = getOrCreate(row.date);
    point.transportAllowancesDelivered = row.transportAllowancesDelivered;
    point.snacksDelivered = row.snacksDelivered;
    point.lunchesDelivered = row.lunchesDelivered;
  }

  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}
