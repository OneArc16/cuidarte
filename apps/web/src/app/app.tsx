import { useEffect } from "react";

import { SessionLoadingScreen } from "./components/session-loading-screen";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { HOME_PATH, LOGIN_PATH } from "./routes/paths";
import {
  ADULTOS_MAYORES_NEW_PATH,
  ADULTOS_MAYORES_PATH,
  getAdultoMayorEditIdFromPath,
  isAdultosMayoresImportPath,
  isAdultosMayoresPath,
} from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import {
  canImportAdultosMayores,
  canManageAdultosMayores,
} from "@/features/adultos-mayores/lib/adultos-mayores-permissions";
import {
  canManageAlimentacion,
  canOpenAlimentacion,
} from "@/features/alimentacion/lib/alimentacion-permissions";
import {
  getAlimentacionCreateAdultoMayorIdFromPath,
  getAlimentacionEditIdFromPath,
  isAlimentacionPath,
  REGISTRO_ALIMENTACION_NEW_PATH,
  REGISTRO_ALIMENTACION_PATH,
} from "@/features/alimentacion/lib/alimentacion-paths";
import { canManageActividadesGrupales } from "@/features/actividades-grupales/lib/actividades-grupales-permissions";
import {
  CREACION_ACTIVIDADES_NEW_PATH,
  CREACION_ACTIVIDADES_PATH,
  getActividadGrupalDiligenciamientoIdFromPath,
  isActividadesGrupalesPath,
} from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { LoginPage } from "@/features/auth/pages/login-page";
import { useCurrentUserQuery } from "@/features/auth/model/auth-queries";
import { HomePage } from "@/features/home/pages/home-page";
import { isBackofficePath } from "@/features/backoffice/lib/backoffice-paths";
import {
  EMPLEADOS_NEW_PATH,
  EMPLEADOS_PATH,
  getEmpleadoEditIdFromPath,
  isEmpleadosPath,
} from "@/features/empleados/lib/empleados-paths";
import { canManageEmpleados, canOpenEmpleados } from "@/features/empleados/lib/empleados-permissions";
import { getAtencionIndividualCreateAdultoIdFromPath } from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";

export function App() {
  const currentUserQuery = useCurrentUserQuery();
  const { path, navigate } = useAppNavigation();
  const user = currentUserQuery.data?.user ?? null;

  useEffect(() => {
    if (currentUserQuery.isLoading) {
      return;
    }

    if (user === null) {
      if (path !== LOGIN_PATH) {
        navigate(LOGIN_PATH, { replace: true });
      }

      return;
    }

    if (isBackofficePath(path) && user.role !== "super_admin") {
      navigate(HOME_PATH, { replace: true });
      return;
    }

    if (isEmpleadosPath(path) && !canOpenEmpleados(user)) {
      navigate(HOME_PATH, { replace: true });
      return;
    }

    if (isActividadesGrupalesPath(path) && user.role !== "super_admin" && user.tenantId === null) {
      navigate(HOME_PATH, { replace: true });
      return;
    }

    if (isAlimentacionPath(path)) {
      if (!canOpenAlimentacion(user)) {
        navigate(HOME_PATH, { replace: true });
        return;
      }

      if (user.role !== "super_admin" && user.tenantId === null) {
        navigate(HOME_PATH, { replace: true });
        return;
      }

      const isAlimentacionWritePath =
        path === REGISTRO_ALIMENTACION_NEW_PATH ||
        getAlimentacionCreateAdultoMayorIdFromPath(path) !== null ||
        getAlimentacionEditIdFromPath(path) !== null;

      if (!canManageAlimentacion(user) && isAlimentacionWritePath) {
        navigate(REGISTRO_ALIMENTACION_PATH, { replace: true });
        return;
      }
    }

    if (isActividadesGrupalesPath(path)) {
      const isActividadesWritePath =
        path === CREACION_ACTIVIDADES_NEW_PATH ||
        getActividadGrupalDiligenciamientoIdFromPath(path) !== null;

      if (!canManageActividadesGrupales(user) && isActividadesWritePath) {
        navigate(CREACION_ACTIVIDADES_PATH, { replace: true });
        return;
      }
    }

    if (isEmpleadosPath(path)) {
      const isEmpleadosWritePath =
        path === EMPLEADOS_NEW_PATH || getEmpleadoEditIdFromPath(path) !== null;

      if (!canManageEmpleados(user) && isEmpleadosWritePath) {
        navigate(EMPLEADOS_PATH, { replace: true });
        return;
      }
    }

    if (isAdultosMayoresPath(path)) {
      if (isAdultosMayoresImportPath(path)) {
        if (!canImportAdultosMayores(user)) {
          navigate(HOME_PATH, { replace: true });
          return;
        }
      } else if (user.role !== "super_admin" && user.tenantId === null) {
        navigate(HOME_PATH, { replace: true });
        return;
      }

      const isAdultosWritePath =
        path === ADULTOS_MAYORES_NEW_PATH ||
        getAdultoMayorEditIdFromPath(path) !== null ||
        getAtencionIndividualCreateAdultoIdFromPath(path) !== null;

      if (!canManageAdultosMayores(user) && isAdultosWritePath) {
        navigate(ADULTOS_MAYORES_PATH, { replace: true });
        return;
      }
    }

    if (
      path !== HOME_PATH &&
      !isBackofficePath(path) &&
      !isAdultosMayoresPath(path) &&
      !isAlimentacionPath(path) &&
      !isActividadesGrupalesPath(path) &&
      !isEmpleadosPath(path)
    ) {
      navigate(HOME_PATH, { replace: true });
    }
  }, [currentUserQuery.isLoading, navigate, path, user]);

  useEffect(() => {
    document.title =
      user === null
        ? "Iniciar sesion | CuidarTe"
        : isBackofficePath(path)
          ? "BackOffice | CuidarTe"
          : isAdultosMayoresPath(path)
            ? isAdultosMayoresImportPath(path)
              ? "Importar adultos mayores | CuidarTe"
              : "Adultos mayores | CuidarTe"
            : isAlimentacionPath(path)
              ? "Registro de alimentacion | CuidarTe"
              : isActividadesGrupalesPath(path)
                ? "Sesiones grupales | CuidarTe"
                : isEmpleadosPath(path)
                  ? "Gestion de empleados | CuidarTe"
                  : "Inicio | CuidarTe";
  }, [path, user]);

  if (currentUserQuery.isLoading) {
    return <SessionLoadingScreen />;
  }

  if (user === null) {
    return <LoginPage onAuthenticated={() => navigate(HOME_PATH, { replace: true })} />;
  }

  return (
    <HomePage
      path={path}
      user={user}
      navigate={navigate}
      onLogoutSuccess={() => navigate(LOGIN_PATH, { replace: true })}
    />
  );
}
