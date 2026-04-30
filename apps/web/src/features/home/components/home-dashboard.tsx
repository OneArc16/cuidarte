import {
  type HomeDashboardIndicatorId,
  type HomeDashboardResponse,
  type HomeDashboardShortcutModuleId,
  type AuthUser,
} from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { HomeDashboardIndicatorCard } from "./home-dashboard-indicator-card";
import { HomeDashboardShortcutCard } from "./home-dashboard-shortcut-card";
import { HOME_DASHBOARD_INDICATORS } from "../lib/home-dashboard-definitions";
import {
  canViewModule,
  HOME_MODULES,
  isShortcutModule,
  type ShortcutHomeModule,
} from "../lib/home-modules";
import { useHomeDashboardQuery } from "../model/home-queries";

type HomeDashboardProps = {
  user: AuthUser;
  navigate: Navigate;
};

type ShortcutTotals = Partial<Record<HomeDashboardShortcutModuleId, number>>;
type IndicatorTotals = Partial<Record<HomeDashboardIndicatorId, number>>;

const HOME_SHORTCUT_MODULES = HOME_MODULES.filter(isShortcutModule) as readonly ShortcutHomeModule[];

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

  return (
    <>
      <header className="home-heading">
        <div className="home-heading__copy">
          <p className="eyebrow">Inicio</p>
          <span className="home-heading__product">CuidarTe</span>
          <h1 id="home-title">{user.fullName}</h1>
        </div>
      </header>

      <section className="home-dashboard-section" aria-labelledby="home-shortcuts-title">
        <div className="home-dashboard-section__header">
          <div>
            <p className="eyebrow">Accesos</p>
            <h2 id="home-shortcuts-title">Módulos del sistema</h2>
          </div>
          <p>
            Accesos directos con el volumen actual de cada modulo dentro del alcance de tu sesion.
          </p>
        </div>

        <div
          className="home-shortcuts-grid"
          aria-busy={dashboardQuery.isLoading ? "true" : "false"}
        >
          {visibleShortcutModules.map((module) => (
            <HomeDashboardShortcutCard
              key={module.id}
              module={module}
              total={shortcutTotals[module.id]}
              onClick={() => {
                navigate(module.path);
              }}
            />
          ))}
        </div>
      </section>

      {visibleIndicators.length > 0 ? (
        <section className="home-dashboard-section" aria-labelledby="home-indicators-title">
          <div className="home-dashboard-section__header">
            <div>
              <p className="eyebrow">Indicadores</p>
              <h2 id="home-indicators-title">Resumen operativo</h2>
            </div>
            <p>
              Vista consolidada con las cantidades que mas se consultan en el arranque del dia.
            </p>
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

function resolveModulePath(moduleId: HomeDashboardShortcutModuleId): string {
  return resolveShortcutModule(moduleId).path;
}

function resolveShortcutModule(moduleId: HomeDashboardShortcutModuleId): ShortcutHomeModule {
  const module = HOME_SHORTCUT_MODULES.find((candidate) => candidate.id === moduleId);

  if (module === undefined) {
    throw new Error(`Modulo no configurado para el dashboard: ${moduleId}`);
  }

  return module;
}
