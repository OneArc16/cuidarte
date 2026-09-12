import {
  type AuthUser,
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
import { and, eq, isNull, sql, type SQL } from "drizzle-orm";
import { type AnyPgColumn } from "drizzle-orm/pg-core";

import { DatabaseService } from "../../database/database.service";
import {
  actividadesGrupales,
  adultosMayores,
  adultoMayorImportBatches,
  atencionesIndividuales,
  atencionesEnfermeria,
  alimentacionRegistros,
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
};

type AlimentacionSummary = {
  recordsTotal: number;
  deliveredRationsTotal: number;
};

const ACTIVITY_INDICATOR_IDS = [
  "salud_preventiva",
  "sesiones_psicosocial",
  "encuentro_intergeneracional",
  "nutricion",
  "actividades_manualidad",
  "fisioterapia",
  "actividad_campo",
  "actividades_recreacion",
] as const satisfies readonly HomeDashboardIndicatorId[];

type ActivityIndicatorId = (typeof ACTIVITY_INDICATOR_IDS)[number];

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

    return homeDashboardResponseSchema.parse({
      shortcuts: this.buildShortcuts(shortcutTotals),
      indicators: this.buildIndicators(indicatorTotals),
    });
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
        activityType: actividadesGrupales.activityType,
        total: sql<number>`count(*)::int`,
      })
      .from(actividadesGrupales)
      .groupBy(actividadesGrupales.activityType);
    const [totalRow, groupedRows] = await Promise.all([
      activeCondition === undefined ? totalQuery : totalQuery.where(activeCondition),
      activeCondition === undefined
        ? groupedQuery
        : groupedQuery.where(activeCondition),
    ]);

    const byIndicatorId: Partial<Record<HomeDashboardIndicatorId, number>> = {};

    for (const indicatorId of ACTIVITY_INDICATOR_IDS) {
      byIndicatorId[indicatorId] = 0;
    }

    for (const row of groupedRows) {
      if (isActivityIndicatorId(row.activityType)) {
        byIndicatorId[row.activityType] = row.total;
      }
    }

    return {
      total: totalRow[0]?.total ?? 0,
      byIndicatorId,
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
  ): Promise<number> {
    const scopeCondition = this.buildScopeCondition(scope, tenantColumn);
    const where =
      scopeCondition === undefined
        ? isNull(adultosMayores.deletedAt)
        : and(scopeCondition, isNull(adultosMayores.deletedAt));
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

function isActivityIndicatorId(
  value: typeof actividadesGrupales.$inferSelect.activityType,
): value is ActivityIndicatorId {
  return ACTIVITY_INDICATOR_IDS.includes(value as ActivityIndicatorId);
}
