import {
  type HomeDashboardIndicatorId,
  type HomeDashboardActivityIndicator,
  type HomeDashboardResponse,
  type HomeDashboardShortcutModuleId,
  type AuthUser,
  homeDashboardShortcutModuleIdValues,
} from "@cuidarte/contracts";
import { CalendarPlus } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { CREACION_ACTIVIDADES_PATH } from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { saveActividadesGrupalesFilters } from "@/features/actividades-grupales/lib/actividades-grupales-filter-state";

import { HomeDashboardIndicatorCard } from "./home-dashboard-indicator-card";
import { HomeDashboardShortcutCard } from "./home-dashboard-shortcut-card";
import {
  HOME_DASHBOARD_INDICATORS,
  type HomeDashboardIndicatorDefinition,
} from "../lib/home-dashboard-definitions";
import { canViewModule, HOME_MODULES, type ShortcutHomeModule } from "../lib/home-modules";
import { useHomeDashboardQuery } from "../model/home-queries";

type HomeDashboardProps = {
  user: AuthUser;
  navigate: Navigate;
};

type ShortcutTotals = Partial<Record<HomeDashboardShortcutModuleId, number>>;
type IndicatorTotals = Partial<Record<HomeDashboardIndicatorId, number>>;
type HomeDashboardIndicatorTargetModuleId = HomeDashboardIndicatorDefinition["targetModuleId"];

const HOME_SHORTCUT_MODULE_IDS = new Set(homeDashboardShortcutModuleIdValues);
const HOME_SHORTCUT_MODULES = HOME_MODULES.filter((module) =>
  HOME_SHORTCUT_MODULE_IDS.has(module.id as HomeDashboardShortcutModuleId),
) as readonly ShortcutHomeModule[];

export function HomeDashboard({ navigate, user }: HomeDashboardProps) {
  const dashboardQuery = useHomeDashboardQuery();
  const shortcutTotals = buildShortcutTotals(dashboardQuery.data);
  const indicatorTotals = buildIndicatorTotals(dashboardQuery.data);
  const visibleShortcutModules = HOME_SHORTCUT_MODULES.filter((module) =>
    canViewModule(module, user.role),
  );
  const visibleIndicators = HOME_DASHBOARD_INDICATORS.filter(
    (indicator) => indicatorTotals[indicator.id] !== undefined,
  );
  const activityIndicators =
    user.role === "super_admin"
      ? consolidateActivityIndicators(dashboardQuery.data?.activityIndicators ?? [])
      : (dashboardQuery.data?.activityIndicators ?? []);

  return (
    <>
      <h1 id="home-title" className="visually-hidden">
        {user.fullName}
      </h1>

      <section className="home-dashboard-section" aria-labelledby="home-shortcuts-title">
        <div className="home-dashboard-section__header">
          <div>
            <span className="eyebrow">Accesos</span>
            <h2 id="home-shortcuts-title">Módulos del sistema</h2>
          </div>
        </div>

        <div
          className="home-shortcuts-grid"
          aria-busy={dashboardQuery.isLoading ? "true" : "false"}
        >
          {visibleShortcutModules.map((module) => (
            <HomeDashboardShortcutCard
              key={module.id}
              module={module}
              total={shortcutTotals[module.id as HomeDashboardShortcutModuleId]}
              onClick={() => {
                navigate(module.path);
              }}
            />
          ))}
        </div>
      </section>

      {visibleIndicators.length > 0 || activityIndicators.length > 0 ? (
        <section className="home-dashboard-section" aria-labelledby="home-indicators-title">
          <div className="home-dashboard-section__header">
            <div>
              <span className="eyebrow">Indicadores</span>
              <h2 id="home-indicators-title">Resumen operativo</h2>
            </div>
          </div>

          <div
            className="home-indicators-grid"
            aria-busy={dashboardQuery.isLoading ? "true" : "false"}
          >
            {visibleIndicators.map((indicator) => {
              const total = indicatorTotals[indicator.id];

              if (total === undefined) {
                return null;
              }

              return (
                <HomeDashboardIndicatorCard
                  key={indicator.id}
                  definition={indicator}
                  total={total}
                  onClick={() => {
                    navigate(resolveModulePath(indicator.targetModuleId));
                  }}
                />
              );
            })}
            {activityIndicators.map((indicator) => (
              <button
                key={indicator.activityTypeId}
                className="home-indicator-card"
                data-tone={indicator.isActive ? "sky" : "ink"}
                type="button"
                aria-label={indicator.label}
                onClick={() => {
                  saveActividadesGrupalesFilters(user.id, {
                    search: "",
                    activityMonth: "",
                    activityType: "",
                    activityTypeId: user.role === "super_admin" ? "" : indicator.activityTypeId,
                    organizer: "",
                    tenantId: "",
                  });
                  navigate(CREACION_ACTIVIDADES_PATH);
                }}
              >
                <span className="home-indicator-card__label">
                  {indicator.label}
                  {indicator.isActive ? "" : " (Inactiva)"}
                </span>
                <span className="home-indicator-card__icon" aria-hidden="true">
                  <CalendarPlus />
                </span>
                <strong>{indicator.total}</strong>
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {dashboardQuery.isError ? (
        <p className="home-dashboard-feedback" role="status">
          No fue posible actualizar los indicadores ahora. Los accesos siguen disponibles.
        </p>
      ) : null}
    </>
  );
}

function consolidateActivityIndicators(
  indicators: readonly HomeDashboardActivityIndicator[],
): HomeDashboardActivityIndicator[] {
  const consolidated = new Map<string, HomeDashboardActivityIndicator>();

  for (const indicator of indicators) {
    const key = indicator.label.trim().toLowerCase();
    const current = consolidated.get(key);

    if (current === undefined) {
      consolidated.set(key, { ...indicator, label: indicator.label.trim() });
      continue;
    }

    consolidated.set(key, {
      ...current,
      isActive: current.isActive || indicator.isActive,
      total: current.total + indicator.total,
    });
  }

  return [...consolidated.values()].sort((left, right) => left.label.localeCompare(right.label));
}

function buildShortcutTotals(data: HomeDashboardResponse | undefined): ShortcutTotals {
  const totals: ShortcutTotals = {};

  if (data === undefined) {
    return totals;
  }

  for (const shortcut of data.shortcuts) {
    totals[shortcut.moduleId] = shortcut.total;
  }

  return totals;
}

function buildIndicatorTotals(data: HomeDashboardResponse | undefined): IndicatorTotals {
  const totals: IndicatorTotals = {};

  if (data === undefined) {
    return totals;
  }

  for (const indicator of data.indicators) {
    totals[indicator.id] = indicator.total;
  }

  return totals;
}

function resolveModulePath(moduleId: HomeDashboardIndicatorTargetModuleId): string {
  const module = HOME_MODULES.find((candidate) => candidate.id === moduleId);

  if (module === undefined) {
    throw new Error(`Modulo no configurado para el dashboard: ${moduleId}`);
  }

  return module.path;
}
