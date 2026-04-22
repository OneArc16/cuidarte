import { useEffect } from "react";

import { SessionLoadingScreen } from "./components/session-loading-screen";
import { useAppNavigation } from "./hooks/use-app-navigation";
import { HOME_PATH, LOGIN_PATH } from "./routes/paths";
import { LoginPage } from "@/features/auth/pages/login-page";
import { useCurrentUserQuery } from "@/features/auth/model/auth-queries";
import { HomePage } from "@/features/home/pages/home-page";
import { isBackofficePath } from "@/features/backoffice/lib/backoffice-paths";

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

    if (path !== HOME_PATH && !isBackofficePath(path)) {
      navigate(HOME_PATH, { replace: true });
    }
  }, [currentUserQuery.isLoading, navigate, path, user]);

  useEffect(() => {
    document.title =
      user === null
        ? "Iniciar sesion | CuidarTe"
        : isBackofficePath(path)
          ? "BackOffice | CuidarTe"
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
