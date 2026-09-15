import { type AuthUser } from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { AdultosMayoresPage } from "@/features/adultos-mayores/pages/adultos-mayores-page";
import {
  isAdultosMayoresImportPath,
  isAdultosMayoresPath,
} from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { AlimentacionPage } from "@/features/alimentacion/pages/alimentacion-page";
import { isAlimentacionPath } from "@/features/alimentacion/lib/alimentacion-paths";
import { ActividadesGrupalesPage } from "@/features/actividades-grupales/pages/actividades-grupales-page";
import { isActividadesGrupalesPath } from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { AjustesPage } from "@/features/ajustes/pages/ajustes-page";
import { isAjustesPath } from "@/features/ajustes/lib/ajustes-paths";
import { BackofficePage } from "@/features/backoffice/pages/backoffice-page";
import { isBackofficePath } from "@/features/backoffice/lib/backoffice-paths";
import { isAtencionesEnfermeriaPath } from "@/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths";
import { AtencionesEnfermeriaPage } from "@/features/atenciones-enfermeria/pages/atenciones-enfermeria-page";
import { EmpleadosPage } from "@/features/empleados/pages/empleados-page";
import { isEmpleadosPath } from "@/features/empleados/lib/empleados-paths";
import { isReportsPath } from "@/features/reports/lib/reports-paths";
import { ReportsPage } from "@/features/reports/pages/reports-page";

import { HomeDashboard } from "../components/home-dashboard";
import { HomeDirectAccess } from "../components/home-direct-access";
import { HomeDesktopSidebar } from "../components/home-desktop-sidebar";
import { HomeMobileNavigation } from "../components/home-mobile-navigation";
import { canViewHomeDashboard } from "../lib/home-dashboard-permissions";
import { useMediaQuery } from "../hooks/use-media-query";

const MOBILE_HOME_QUERY = "(max-width: 800px)";

type HomePageProps = {
  path: string;
  user: AuthUser;
  navigate: Navigate;
  onLogoutSuccess: () => void;
};

export function HomePage({ navigate, onLogoutSuccess, path, user }: HomePageProps) {
  const isMobileViewport = useMediaQuery(MOBILE_HOME_QUERY);
  const canViewDashboard = canViewHomeDashboard(user);

  const activeModuleId = isBackofficePath(path)
    ? "backoffice"
    : isAdultosMayoresImportPath(path)
      ? "importacion-adultos-mayores"
      : isAdultosMayoresPath(path)
        ? "adultos-mayores"
        : isAlimentacionPath(path)
          ? "registro-alimentacion"
          : isAtencionesEnfermeriaPath(path)
            ? "atenciones-enfermeria"
            : isActividadesGrupalesPath(path)
              ? "sesiones-grupales"
              : isEmpleadosPath(path)
                ? "gestion-empleados"
                : isReportsPath(path)
                  ? "reportes"
                  : isAjustesPath(path)
                    ? "ajustes"
                    : "inicio";

  return (
    <main className="home-shell">
      {isMobileViewport ? null : (
        <HomeDesktopSidebar
          activeModuleId={activeModuleId}
          user={user}
          navigate={navigate}
          onLogoutSuccess={onLogoutSuccess}
        />
      )}

      <section
        className="home-workspace"
        aria-labelledby={
          isBackofficePath(path)
            ? undefined
            : isAdultosMayoresPath(path)
              ? "adultos-mayores-title"
              : isAlimentacionPath(path)
                ? "alimentacion-title"
                : isAtencionesEnfermeriaPath(path)
                  ? "atenciones-enfermeria-title"
                  : isActividadesGrupalesPath(path)
                    ? "actividades-title"
                    : isEmpleadosPath(path)
                      ? "empleados-title"
                      : isReportsPath(path)
                        ? "reports-title"
                        : isAjustesPath(path)
                          ? "ajustes-title"
                          : "home-title"
        }
      >
        {isBackofficePath(path) ? (
          <BackofficePage path={path} navigate={navigate} />
        ) : isAdultosMayoresPath(path) ? (
          <AdultosMayoresPage path={path} navigate={navigate} user={user} />
        ) : isAlimentacionPath(path) ? (
          <AlimentacionPage path={path} navigate={navigate} user={user} />
        ) : isAtencionesEnfermeriaPath(path) ? (
          <AtencionesEnfermeriaPage path={path} navigate={navigate} user={user} />
        ) : isActividadesGrupalesPath(path) ? (
          <ActividadesGrupalesPage path={path} navigate={navigate} user={user} />
        ) : isEmpleadosPath(path) ? (
          <EmpleadosPage path={path} navigate={navigate} user={user} />
        ) : isReportsPath(path) ? (
          <ReportsPage user={user} />
        ) : isAjustesPath(path) ? (
          <AjustesPage user={user} />
        ) : canViewDashboard ? (
          <HomeDashboard navigate={navigate} user={user} />
        ) : (
          <HomeDirectAccess navigate={navigate} user={user} />
        )}
      </section>

      {isMobileViewport ? (
        <HomeMobileNavigation
          activeModuleId={activeModuleId}
          user={user}
          navigate={navigate}
          onLogoutSuccess={onLogoutSuccess}
        />
      ) : null}
    </main>
  );
}
