import {
  type AuthUser,
  type HomeDashboardActivityIndicator,
  type HomeDashboardIndicator,
  type HomeDashboardIndicatorId,
  type HomeDashboardResponse,
  type HomeDashboardShortcut,
  type HomeDashboardShortcutModuleId,
  homeDashboardIndicatorIdValues,
  homeDashboardResponseSchema,
  homeDashboardShortcutModuleIdValues,
} from "@cuidarte/contracts";
import { ForbiddenException, Injectable } from "@nestjs/common";
import { and, eq, gte, isNull, sql, type SQL } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";

import { DatabaseService } from "../../database/database.service";
import {
  actividadesGrupales,
  adultosMayores,
  adultoMayorImportBatches,
  atencionesIndividuales,
  atencionesEnfermeria,
  alimentacionRegistros,
  actividadGrupalTipos,
  tenants,
  users,
} from "../../database/schema";
import { resolveActividadesGrupalesScope } from "../actividades-grupales/domain/actividad-grupal.policy";
import { canImportAdultosMayores } from "../adultos-mayores/domain/adulto-mayor-import.policy";
import { resolveAdultosMayoresScope } from "../adultos-mayores/domain/adulto-mayor.policy";
import { resolveAtencionIndividualScope } from "../atenciones-individuales/domain/atencion-individual.policy";
import { resolveAtencionEnfermeriaScope } from "../atenciones-enfermeria/domain/atencion-enfermeria.policy";
import { resolveAlimentacionScope } from "../alimentacion/domain/alimentacion.policy";
import { resolveEmpleadosScope } from "../empleados/domain/empleado.policy";
import { canViewHomeDashboard } from "./home.policy";

type TenantScope = { type: "all" } | { type: "tenant"; tenantId: string };

type ActivitySummary = {
  total: number;
  byIndicatorId: Partial<Record<HomeDashboardIndicatorId, number>>;
  activityIndicators: HomeDashboardActivityIndicator[];
};

type AlimentacionSummary = {
  recordsTotal: number;
  deliveredRationsTotal: number;
  refrigerio1Total: number;
  almuerzoTotal: number;
  refrigerio2Total: number;
  auxilioTransporteTotal: number;
};

type DashboardAnalytics = NonNullable<HomeDashboardResponse["analytics"]>;

@Injectable()
export class HomeService {
  constructor(private readonly database: DatabaseService) {}

  async getDashboard(actor: AuthUser): Promise<HomeDashboardResponse> {
    if (!canViewHomeDashboard(actor)) {
      throw new ForbiddenException("No tienes permisos para acceder a este recurso.");
    }

    const adultosScope = resolveAdultosMayoresScope(actor);
    const atencionesScope = resolveAtencionEnfermeriaScope(actor);
    const atencionesMedicoScope = resolveAtencionIndividualScope(actor);
    const actividadesScope = resolveActividadesGrupalesScope(actor);
    const alimentacionScope = resolveAlimentacionScope(actor);
    const empleadosScope = resolveEmpleadosScope(actor);
    const importScope = canImportAdultosMayores(actor) ? adultosScope : null;

    const [
      adultosTotal,
      atencionesTotal,
      atencionesMedicoTotal,
      actividadesSummary,
      alimentacionSummary,
      empleadosTotal,
      tenantsTotal,
      importsTotal,
    ] = await Promise.all([
      adultosScope === null
        ? Promise.resolve<number | null>(null)
        : this.countAdultosMayores(adultosScope),
      atencionesScope === null
        ? Promise.resolve<number | null>(null)
        : this.countAtencionesEnfermeria(atencionesScope),
      atencionesMedicoScope === null
        ? Promise.resolve<number | null>(null)
        : this.countAtencionesMedico(atencionesMedicoScope),
      actividadesScope === null
        ? Promise.resolve<ActivitySummary | null>(null)
        : this.summarizeActividades(actividadesScope),
      alimentacionScope === null
        ? Promise.resolve<AlimentacionSummary | null>(null)
        : this.summarizeAlimentacion(alimentacionScope),
      empleadosScope === null
        ? Promise.resolve<number | null>(null)
        : this.countEmpleados(empleadosScope),
      actor.role === "super_admin"
        ? this.countActiveTenants()
        : Promise.resolve<number | null>(null),
      importScope === null
        ? Promise.resolve<number | null>(null)
        : this.countCompletedImports(importScope),
    ]);

    const shortcutTotals: Partial<
      Record<HomeDashboardShortcutModuleId | "importacion-adultos-mayores", number>
    > = {};
    const indicatorTotals: Partial<Record<HomeDashboardIndicatorId, number>> = {};

    if (adultosTotal !== null) {
      shortcutTotals["adultos-mayores"] = adultosTotal;
      indicatorTotals.adultos_registrados = adultosTotal;
    }

    if (atencionesTotal !== null) {
      indicatorTotals.atenciones_enfermeria = atencionesTotal;
    }

    if (atencionesMedicoTotal !== null) {
      indicatorTotals.atenciones_medico = atencionesMedicoTotal;
    }

    if (actividadesSummary !== null) {
      shortcutTotals["sesiones-grupales"] = actividadesSummary.total;

      for (const indicatorId of homeDashboardIndicatorIdValues) {
        const total = actividadesSummary.byIndicatorId[indicatorId];

        if (total !== undefined) {
          indicatorTotals[indicatorId] = total;
        }
      }
    }

    if (alimentacionSummary !== null) {
      shortcutTotals["registro-alimentacion"] = alimentacionSummary.recordsTotal;
      indicatorTotals.raciones_entregadas = alimentacionSummary.deliveredRationsTotal;
    }

    if (empleadosTotal !== null) {
      shortcutTotals["gestion-empleados"] = empleadosTotal;
    }

    if (tenantsTotal !== null) {
      shortcutTotals.backoffice = tenantsTotal;
    }

    if (importsTotal !== null) {
      shortcutTotals["importacion-adultos-mayores"] = importsTotal;
    }

    const analytics =
      actor.role === "auditor"
        ? await this.summarizeDashboardAnalytics(adultosScope, alimentacionScope, actividadesSummary)
        : null;

    return homeDashboardResponseSchema.parse({
      shortcuts: this.buildShortcuts(shortcutTotals),
      indicators: this.buildIndicators(indicatorTotals),
      activityIndicators: actividadesSummary?.activityIndicators ?? [],
      foodSummary:
        alimentacionSummary === null
          ? null
          : {
              deliveredTotal: alimentacionSummary.deliveredRationsTotal,
              refrigerio1Total: alimentacionSummary.refrigerio1Total,
              almuerzoTotal: alimentacionSummary.almuerzoTotal,
              refrigerio2Total: alimentacionSummary.refrigerio2Total,
              auxilioTransporteTotal: alimentacionSummary.auxilioTransporteTotal,
            },
      analytics,
    });
  }

  private async summarizeDashboardAnalytics(
    adultosScope: TenantScope | null,
    alimentacionScope: TenantScope | null,
    actividadesSummary: ActivitySummary | null,
  ): Promise<DashboardAnalytics | null> {
    if (adultosScope === null && alimentacionScope === null && actividadesSummary === null) {
      return null;
    }

    const [sexDistribution, monthlyDeliveries] = await Promise.all([
      adultosScope === null ? Promise.resolve({ male: 0, female: 0 }) : this.countSexDistribution(adultosScope),
      alimentacionScope === null ? Promise.resolve(buildMonthlyDeliverySeries([])) : this.countMonthlyDeliveries(alimentacionScope),
    ]);

    return {
      sexDistribution,
      activitiesByType: (actividadesSummary?.activityIndicators ?? [])
        .filter((indicator) => indicator.total > 0)
        .map((indicator) => ({ label: indicator.label, total: indicator.total })),
      monthlyDeliveries,
    };
  }

  private async countSexDistribution(scope: TenantScope): Promise<DashboardAnalytics["sexDistribution"]> {
    const scopeCondition = this.buildScopeCondition(scope, adultosMayores.tenantId);
    const where = scopeCondition === undefined ? isNull(adultosMayores.deletedAt) : and(scopeCondition, isNull(adultosMayores.deletedAt));
    const rows = await this.database.db
      .select({ sex: adultosMayores.sex, total: sql<number>`count(*)::int` })
      .from(adultosMayores)
      .where(where)
      .groupBy(adultosMayores.sex);
    return {
      male: rows.find((row) => row.sex === "male")?.total ?? 0,
      female: rows.find((row) => row.sex === "female")?.total ?? 0,
    };
  }

  private async countMonthlyDeliveries(scope: TenantScope): Promise<DashboardAnalytics["monthlyDeliveries"]> {
    const months = buildRollingMonths();
    const scopeCondition = this.buildScopeCondition(scope, alimentacionRegistros.tenantId);
    const where = and(
      scopeCondition ?? sql`true`,
      isNull(adultosMayores.deletedAt),
      gte(alimentacionRegistros.deliveryDate, `${months[0]!.month}-01`),
    );
    const monthExpression = sql<string>`to_char(${alimentacionRegistros.deliveryDate}, 'YYYY-MM')`;
    const rows = await this.database.db
      .select({
        month: monthExpression,
        rationsDelivered: sql<number>`coalesce(sum((case when ${alimentacionRegistros.refrigerio1} = 'entregado' then 1 else 0 end) + (case when ${alimentacionRegistros.almuerzo} = 'entregado' then 1 else 0 end) + (case when ${alimentacionRegistros.refrigerio2} = 'entregado' then 1 else 0 end)), 0)::int`,
        transportAllowancesDelivered: sql<number>`coalesce(sum(case when ${alimentacionRegistros.auxilioTransporte} = 'entregado' then 1 else 0 end), 0)::int`,
      })
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId))
      .where(where)
      .groupBy(monthExpression);
    return buildMonthlyDeliverySeries(rows);
  }

  private async countAdultosMayores(scope: TenantScope): Promise<number> {
    return this.countScopedRows(
      adultosMayores,
      adultosMayores.tenantId,
      scope,
      isNull(adultosMayores.deletedAt),
    );
  }

  private async countAtencionesEnfermeria(scope: TenantScope): Promise<number> {
    return await this.countRelatedRows(
      atencionesEnfermeria,
      atencionesEnfermeria.tenantId,
      atencionesEnfermeria.adultoMayorId,
      scope,
      isNull(atencionesEnfermeria.deletedAt),
    );
  }

  private async countAtencionesMedico(scope: TenantScope): Promise<number> {
    return await this.countRelatedRows(
      atencionesIndividuales,
      atencionesIndividuales.tenantId,
      atencionesIndividuales.adultoMayorId,
      scope,
    );
  }

  private async countEmpleados(scope: TenantScope): Promise<number> {
    const scopeCondition = this.buildScopeCondition(scope, users.tenantId);
    const where =
      scopeCondition === undefined
        ? eq(users.isActive, true)
        : and(scopeCondition, eq(users.isActive, true));
    const [row] = await this.database.db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(where);

    return row?.total ?? 0;
  }

  private async countActiveTenants(): Promise<number> {
    const [row] = await this.database.db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(tenants)
      .where(eq(tenants.isActive, true));

    return row?.total ?? 0;
  }

  private async countCompletedImports(scope: TenantScope): Promise<number> {
    try {
      return await this.countScopedRows(
        adultoMayorImportBatches,
        adultoMayorImportBatches.tenantId,
        scope,
        eq(adultoMayorImportBatches.status, "completed"),
      );
    } catch {
      return 0;
    }
  }

  private async summarizeActividades(scope: TenantScope): Promise<ActivitySummary> {
    const scopeCondition = this.buildScopeCondition(scope, actividadesGrupales.tenantId);
    const typeScopeCondition = this.buildScopeCondition(scope, actividadGrupalTipos.tenantId);
    const activeCondition =
      scopeCondition === undefined
        ? isNull(actividadesGrupales.deletedAt)
        : and(scopeCondition, isNull(actividadesGrupales.deletedAt));
    const totalQuery = this.database.db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(actividadesGrupales);
    const groupedQuery = this.database.db
      .select({
        activityTypeId: actividadGrupalTipos.id,
        label: actividadGrupalTipos.name,
        isActive: actividadGrupalTipos.isActive,
        total: sql<number>`count(${actividadesGrupales.id})::int`,
      })
      .from(actividadGrupalTipos)
      .leftJoin(
        actividadesGrupales,
        and(
          eq(actividadesGrupales.activityTypeId, actividadGrupalTipos.id),
          isNull(actividadesGrupales.deletedAt),
        ),
      )
      .groupBy(actividadGrupalTipos.id);
    const [totalRow, groupedRows] = await Promise.all([
      activeCondition === undefined ? totalQuery : totalQuery.where(activeCondition),
      typeScopeCondition === undefined ? groupedQuery : groupedQuery.where(typeScopeCondition),
    ]);

    const byIndicatorId: Partial<Record<HomeDashboardIndicatorId, number>> = {};

    const activityIndicators = groupedRows
      .filter((row) => row.isActive || row.total > 0)
      .map((row) => ({
        activityTypeId: row.activityTypeId,
        label: row.label,
        isActive: row.isActive,
        total: row.total,
      }));

    return {
      total: totalRow[0]?.total ?? 0,
      byIndicatorId,
      activityIndicators,
    };
  }

  private async summarizeAlimentacion(scope: TenantScope): Promise<AlimentacionSummary> {
    const scopeCondition = this.buildScopeCondition(scope, alimentacionRegistros.tenantId);
    const activeCondition =
      scopeCondition === undefined
        ? isNull(adultosMayores.deletedAt)
        : and(scopeCondition, isNull(adultosMayores.deletedAt));
    const query = this.database.db
      .select({
        recordsTotal: sql<number>`count(*)::int`,
        refrigerio1Total: sql<number>`coalesce(sum(case when ${alimentacionRegistros.refrigerio1} = 'entregado' then 1 else 0 end), 0)::int`,
        almuerzoTotal: sql<number>`coalesce(sum(case when ${alimentacionRegistros.almuerzo} = 'entregado' then 1 else 0 end), 0)::int`,
        refrigerio2Total: sql<number>`coalesce(sum(case when ${alimentacionRegistros.refrigerio2} = 'entregado' then 1 else 0 end), 0)::int`,
        auxilioTransporteTotal: sql<number>`coalesce(sum(case when ${alimentacionRegistros.auxilioTransporte} = 'entregado' then 1 else 0 end), 0)::int`,
        deliveredRationsTotal: sql<number>`coalesce(sum(
          (case when ${alimentacionRegistros.refrigerio1} = 'entregado' then 1 else 0 end) +
          (case when ${alimentacionRegistros.almuerzo} = 'entregado' then 1 else 0 end) +
          (case when ${alimentacionRegistros.refrigerio2} = 'entregado' then 1 else 0 end) +
          (case when ${alimentacionRegistros.auxilioTransporte} = 'entregado' then 1 else 0 end)
        ), 0)::int`,
      })
      .from(alimentacionRegistros)
      .innerJoin(adultosMayores, eq(adultosMayores.id, alimentacionRegistros.adultoMayorId));
    const [row] = await query.where(activeCondition);

    return {
      recordsTotal: row?.recordsTotal ?? 0,
      deliveredRationsTotal: row?.deliveredRationsTotal ?? 0,
      refrigerio1Total: row?.refrigerio1Total ?? 0,
      almuerzoTotal: row?.almuerzoTotal ?? 0,
      refrigerio2Total: row?.refrigerio2Total ?? 0,
      auxilioTransporteTotal: row?.auxilioTransporteTotal ?? 0,
    };
  }

  private async countScopedRows(
    table:
      | typeof adultosMayores
      | typeof adultoMayorImportBatches
      | typeof atencionesEnfermeria
      | typeof atencionesIndividuales,
    tenantColumn: AnyPgColumn,
    scope: TenantScope,
    extraCondition?: SQL,
  ): Promise<number> {
    const scopeCondition = this.buildScopeCondition(scope, tenantColumn);
    const where =
      extraCondition === undefined
        ? scopeCondition
        : scopeCondition === undefined
          ? extraCondition
          : and(scopeCondition, extraCondition);
    const query = this.database.db
      .select({
        total: sql<number>`count(*)::int`,
      })
      .from(table);
    const [row] = await (where === undefined ? query : query.where(where));

    return row?.total ?? 0;
  }

  private async countRelatedRows(
    table: typeof atencionesEnfermeria | typeof atencionesIndividuales,
    tenantColumn: AnyPgColumn,
    adultoMayorIdColumn: AnyPgColumn,
    scope: TenantScope,
    extraCondition?: SQL,
  ): Promise<number> {
    const scopeCondition = this.buildScopeCondition(scope, tenantColumn);
    const activeAdultCondition = isNull(adultosMayores.deletedAt);
    const conditions =
      scopeCondition === undefined
        ? [activeAdultCondition]
        : [scopeCondition, activeAdultCondition];
    if (extraCondition !== undefined) {
      conditions.push(extraCondition);
    }
    const where = and(...conditions);
    const [row] = await this.database.db
      .select({ total: sql<number>`count(*)::int` })
      .from(table)
      .innerJoin(adultosMayores, eq(adultosMayores.id, adultoMayorIdColumn))
      .where(where);

    return row?.total ?? 0;
  }

  private buildScopeCondition(scope: TenantScope, tenantColumn: AnyPgColumn): SQL | undefined {
    if (scope.type === "tenant") {
      return eq(tenantColumn, scope.tenantId);
    }

    return undefined;
  }

  private buildShortcuts(
    totals: Partial<Record<HomeDashboardShortcutModuleId, number>>,
  ): HomeDashboardShortcut[] {
    const shortcuts: HomeDashboardShortcut[] = [];

    for (const moduleId of homeDashboardShortcutModuleIdValues) {
      const total = totals[moduleId];

      if (total !== undefined) {
        shortcuts.push({ moduleId, total });
      }
    }

    return shortcuts;
  }

  private buildIndicators(
    totals: Partial<Record<HomeDashboardIndicatorId, number>>,
  ): HomeDashboardIndicator[] {
    const indicators: HomeDashboardIndicator[] = [];

    for (const indicatorId of homeDashboardIndicatorIdValues) {
      const total = totals[indicatorId];

      if (total !== undefined) {
        indicators.push({ id: indicatorId, total });
      }
    }

    return indicators;
  }
}

function buildRollingMonths(referenceDate = new Date()): Array<{ month: string }> {
  const months: Array<{ month: string }> = [];
  const cursor = new Date(Date.UTC(referenceDate.getUTCFullYear(), referenceDate.getUTCMonth(), 1));
  cursor.setUTCMonth(cursor.getUTCMonth() - 11);

  for (let index = 0; index < 12; index += 1) {
    months.push({
      month: `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}`,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

function buildMonthlyDeliverySeries(
  rows: Array<{ month: string; rationsDelivered: number; transportAllowancesDelivered: number }>,
): DashboardAnalytics["monthlyDeliveries"] {
  const byMonth = new Map(rows.map((row) => [row.month, row]));
  return buildRollingMonths().map(({ month }) => {
    const row = byMonth.get(month);
    return {
      month,
      rationsDelivered: row?.rationsDelivered ?? 0,
      transportAllowancesDelivered: row?.transportAllowancesDelivered ?? 0,
    };
  });
}
