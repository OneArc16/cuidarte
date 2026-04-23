import { type AuthUser } from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { AdultosMayoresPage } from "@/features/adultos-mayores/pages/adultos-mayores-page";
import { isAdultosMayoresPath } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { ActividadesGrupalesPage } from "@/features/actividades-grupales/pages/actividades-grupales-page";
import { isActividadesGrupalesPath } from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { BackofficePage } from "@/features/backoffice/pages/backoffice-page";
import { isBackofficePath } from "@/features/backoffice/lib/backoffice-paths";
import { EmpleadosPage } from "@/features/empleados/pages/empleados-page";
import { isEmpleadosPath } from "@/features/empleados/lib/empleados-paths";

import { HomeDashboard } from "../components/home-dashboard";
import { HomeDesktopSidebar } from "../components/home-desktop-sidebar";
import { HomeMobileNavigation } from "../components/home-mobile-navigation";
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
  const activeModuleId = isBackofficePath(path)
    ? "backoffice"
    : isAdultosMayoresPath(path)
      ? "adultos-mayores"
      : isActividadesGrupalesPath(path)
        ? "sesiones-grupales"
        : isEmpleadosPath(path)
          ? "gestion-empleados"
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
              : isActividadesGrupalesPath(path)
                ? "actividades-title"
                : isEmpleadosPath(path)
                  ? "empleados-title"
                  : "home-title"
        }
      >
        {isBackofficePath(path) ? (
          <BackofficePage path={path} navigate={navigate} />
        ) : isAdultosMayoresPath(path) ? (
          <AdultosMayoresPage path={path} navigate={navigate} user={user} />
        ) : isActividadesGrupalesPath(path) ? (
          <ActividadesGrupalesPage path={path} navigate={navigate} user={user} />
        ) : isEmpleadosPath(path) ? (
          <EmpleadosPage path={path} navigate={navigate} user={user} />
        ) : (
          <HomeDashboard user={user} />
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
