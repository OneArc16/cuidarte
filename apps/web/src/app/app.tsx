import { type AuthUser } from "@cuidarte/contracts";
import { useCallback, useEffect, useState } from "react";

import { LoginForm } from "../features/auth/ui/login-form";
import { SessionPanel } from "../features/auth/ui/session-panel";
import { useCurrentUserQuery } from "../features/auth/model/auth-queries";

const HOME_PATH = "/home";
const LOGIN_PATH = "/login";

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

    if (path !== HOME_PATH) {
      navigate(HOME_PATH, { replace: true });
    }
  }, [currentUserQuery.isLoading, navigate, path, user]);

  useEffect(() => {
    document.title = user === null ? "Iniciar sesion | Cuidarte" : "Inicio | Cuidarte";
  }, [user]);

  if (currentUserQuery.isLoading) {
    return <SessionLoadingScreen />;
  }

  if (user === null) {
    return <LoginPage onAuthenticated={() => navigate(HOME_PATH, { replace: true })} />;
  }

  return <HomePage user={user} onLogoutSuccess={() => navigate(LOGIN_PATH, { replace: true })} />;
}

type NavigateOptions = {
  replace?: boolean;
};

function useAppNavigation() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const syncPath = () => {
      setPath(window.location.pathname);
    };

    window.addEventListener("popstate", syncPath);

    return () => {
      window.removeEventListener("popstate", syncPath);
    };
  }, []);

  const navigate = useCallback((nextPath: string, options: NavigateOptions = {}) => {
    if (window.location.pathname !== nextPath) {
      window.history[options.replace === true ? "replaceState" : "pushState"]({}, "", nextPath);
    }

    setPath(nextPath);
  }, []);

  return { path, navigate };
}

type LoginPageProps = {
  onAuthenticated: () => void;
};

function LoginPage({ onAuthenticated }: LoginPageProps) {
  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Centro de Vida</p>
          <h1>Cuidarte</h1>
          <p className="hero__copy">
            Ingresa al entorno operativo para gestionar cuidado, sesiones, alimentacion,
            empleados y permisos por tenant.
          </p>
          <div className="hero__signature" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="auth-layout" aria-label="Acceso a Cuidarte">
        <section className="login-card" aria-label="Formulario de inicio de sesion">
          <div className="login-card__header">
            <p className="eyebrow">Ingreso</p>
            <h2>Bienvenido</h2>
            <p>Usa el correo y contrasena asignados por el administrador.</p>
          </div>
          <LoginForm onAuthenticated={onAuthenticated} />
        </section>
      </section>
    </main>
  );
}

type HomePageProps = {
  user: AuthUser;
  onLogoutSuccess: () => void;
};

function HomePage({ user, onLogoutSuccess }: HomePageProps) {
  return (
    <main className="home-shell">
      <header className="home-topbar">
        <BrandLockup />
      </header>

      <section className="home-layout" aria-label="Inicio">
        <div className="home-heading">
          <p className="eyebrow">Inicio</p>
          <h1>{user.fullName}</h1>
        </div>

        <SessionPanel user={user} onLogoutSuccess={onLogoutSuccess} />
      </section>
    </main>
  );
}

function SessionLoadingScreen() {
  return (
    <main className="auth-shell">
      <section className="login-card login-card--loading" aria-busy="true">
        <BrandLockup />
        <p className="auth-loading__title">Validando sesion...</p>
      </section>
    </main>
  );
}

function BrandLockup() {
  return (
    <div className="brand-lockup">
      <span className="brand-lockup__mark" aria-hidden="true">
        C
      </span>
      <span>Cuidarte</span>
    </div>
  );
}
