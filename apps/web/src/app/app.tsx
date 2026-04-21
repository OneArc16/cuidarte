import { type AuthUser } from "@cuidarte/contracts";
import { useCallback, useEffect, useState } from "react";

import { LoginForm } from "../features/auth/ui/login-form";
import { SessionPanel } from "../features/auth/ui/session-panel";
import { useCurrentUserQuery } from "../features/auth/model/auth-queries";

const HOME_PATH = "/home";
const LOGIN_PATH = "/login";
const SLOGAN_ROTATION_INTERVAL_MS = 4200;
const LOGIN_SLOGANS = [
  "Porque cada día importa.",
  "Salud, alegría y bienestar en un solo lugar.",
  "Cuidamos a quienes más quieres.",
  "Tu bienestar, nuestra misión.",
] as const;

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
    document.title = user === null ? "Iniciar sesion | CuidarTe" : "Inicio | CuidarTe";
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
          <h1>CuidarTe</h1>
          <RotatingSlogan slogans={LOGIN_SLOGANS} />
          <div className="hero__signature" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>

      <section className="auth-layout" aria-label="Acceso a CuidarTe">
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

type RotatingSloganProps = {
  slogans: readonly [string, ...string[]];
};

function RotatingSlogan({ slogans }: RotatingSloganProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeSlogan = slogans[activeIndex] ?? slogans[0];

  useEffect(() => {
    if (slogans.length <= 1) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slogans.length);
    }, SLOGAN_ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [slogans]);

  return (
    <p className="hero__slogan" aria-live="polite" key={activeSlogan}>
      {activeSlogan}
    </p>
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
      <span>CuidarTe</span>
    </div>
  );
}
