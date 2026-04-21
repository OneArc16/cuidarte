import { type AuthUser } from "@cuidarte/contracts";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import { LoginForm } from "../features/auth/ui/login-form";
import { useCurrentUserQuery, useLogoutMutation } from "../features/auth/model/auth-queries";

const HOME_PATH = "/home";
const LOGIN_PATH = "/login";
const SLOGAN_ROTATION_INTERVAL_MS = 4200;
const LOGIN_SLOGANS = [
  "Porque cada día importa.",
  "Salud, alegría y bienestar en un solo lugar.",
  "Cuidamos a quienes más quieres.",
  "Tu bienestar, nuestra misión.",
] as const;
const MOBILE_HOME_QUERY = "(max-width: 800px)";
const ROLE_LABELS = {
  super_admin: "SuperAdmin",
  tenant_admin: "Admin de tenant",
  employee: "Empleado",
} satisfies Record<AuthUser["role"], string>;
const HOME_MODULES = [
  {
    id: "inicio",
    label: "Inicio",
    icon: <HomeIcon />,
  },
  {
    id: "adultos-mayores",
    label: "Adultos mayores",
    icon: <OlderAdultsIcon />,
  },
  {
    id: "sesiones-grupales",
    label: "Sesiones grupales",
    icon: <GroupSessionsIcon />,
  },
  {
    id: "creacion-actividades",
    label: "Creación de actividades",
    icon: <ActivityIcon />,
  },
  {
    id: "registro-alimentacion",
    label: "Registro de alimentación",
    icon: <MealIcon />,
  },
  {
    id: "gestion-empleados",
    label: "Gestión de empleados",
    icon: <EmployeesIcon />,
  },
  {
    id: "backoffice",
    label: "BackOffice",
    icon: <BackOfficeIcon />,
    roles: ["super_admin"],
  },
] satisfies readonly HomeModule[];
const MOBILE_PRIMARY_MODULE_IDS = [
  "inicio",
  "adultos-mayores",
  "sesiones-grupales",
  "creacion-actividades",
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
  const isMobileViewport = useMediaQuery(MOBILE_HOME_QUERY);

  return (
    <main className="home-shell">
      {isMobileViewport ? null : (
        <HomeDesktopSidebar user={user} onLogoutSuccess={onLogoutSuccess} />
      )}

      <section className="home-workspace" aria-labelledby="home-title">
        <div className="home-heading">
          <p className="eyebrow">Inicio</p>
          <h1 id="home-title">{user.fullName}</h1>
          <p>Panel operativo para coordinar cuidado, bienestar y acompanamiento del centro.</p>
        </div>

        <section className="home-summary" aria-label="Resumen de sesion">
          <article className="home-summary__item">
            <span>Rol activo</span>
            <strong>{formatRole(user.role)}</strong>
          </article>
          <article className="home-summary__item">
            <span>Centro</span>
            <strong>{user.tenantId ?? "BackOffice"}</strong>
          </article>
          <article className="home-summary__item">
            <span>Clave</span>
            <strong>{user.passwordSetByAdmin ? "Asignada por admin" : "Actualizada"}</strong>
          </article>
        </section>
      </section>

      {isMobileViewport ? (
        <HomeMobileNavigation user={user} onLogoutSuccess={onLogoutSuccess} />
      ) : null}
    </main>
  );
}

type HomeModule = {
  id: string;
  label: string;
  icon: ReactNode;
  roles?: readonly AuthUser["role"][];
};

type HomeSidebarProps = {
  user: AuthUser;
  onLogoutSuccess: () => void;
};

function HomeDesktopSidebar({ user, onLogoutSuccess }: HomeSidebarProps) {
  const visibleModules = HOME_MODULES.filter((module) => canViewModule(module, user.role));

  return (
    <aside className="home-sidebar" aria-label="Menu principal de CuidarTe">
      <div className="home-sidebar__top">
        <BrandLockup />

        <section className="home-user" aria-label="Usuario logueado">
          <span className="home-user__avatar" aria-hidden="true">
            {getInitials(user.fullName)}
          </span>
          <div className="home-user__details">
            <strong>{user.fullName}</strong>
            <span>{formatRole(user.role)}</span>
          </div>
        </section>
      </div>

      <nav className="home-nav" aria-label="Modulos principales">
        <ul>
          {visibleModules.map((module) => {
            const isActive = module.id === "inicio";

            return (
              <li key={module.id}>
                <HomeModuleButton module={module} isActive={isActive} variant="desktop" />
              </li>
            );
          })}
        </ul>
      </nav>

      <SessionLogoutButton className="home-logout" onLogoutSuccess={onLogoutSuccess} />
    </aside>
  );
}

type HomeMobileNavigationProps = {
  user: AuthUser;
  onLogoutSuccess: () => void;
};

function HomeMobileNavigation({ user, onLogoutSuccess }: HomeMobileNavigationProps) {
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const visibleModules = HOME_MODULES.filter((module) => canViewModule(module, user.role));
  const primaryModules = visibleModules.filter((module) => isMobilePrimaryModule(module));
  const secondaryModules = visibleModules.filter((module) => !isMobilePrimaryModule(module));

  useEffect(() => {
    if (!isMoreOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMoreOpen]);

  const closeMore = () => {
    setIsMoreOpen(false);
  };

  return (
    <>
      <nav className="home-mobile-nav" aria-label="Navegacion movil">
        {primaryModules.map((module) => (
          <HomeModuleButton
            key={module.id}
            module={module}
            isActive={module.id === "inicio"}
            variant="mobile"
          />
        ))}
        <button
          className={
            isMoreOpen
              ? "module-button module-button--mobile module-button--more module-button--active"
              : "module-button module-button--mobile module-button--more"
          }
          type="button"
          aria-label="Más"
          aria-controls="home-mobile-more-sheet"
          aria-expanded={isMoreOpen}
          onClick={() => {
            setIsMoreOpen((currentValue) => !currentValue);
          }}
        >
          <span className="module-button__icon" aria-hidden="true">
            <MoreIcon />
          </span>
          <span className="module-button__label">Más</span>
        </button>
      </nav>

      {isMoreOpen ? (
        <div className="home-mobile-sheet-layer">
          <div className="home-mobile-sheet-backdrop" aria-hidden="true" onClick={closeMore} />
          <section
            className="home-mobile-sheet"
            id="home-mobile-more-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="home-mobile-more-title"
          >
            <div className="home-mobile-sheet__header">
              <div>
                <p className="eyebrow">Menu</p>
                <h2 id="home-mobile-more-title">Más módulos</h2>
              </div>
              <button
                className="home-mobile-sheet__close"
                type="button"
                aria-label="Cerrar menu de mas modulos"
                onClick={closeMore}
              >
                <CloseIcon />
              </button>
            </div>

            <section className="home-mobile-sheet__user" aria-label="Usuario logueado">
              <span className="home-user__avatar" aria-hidden="true">
                {getInitials(user.fullName)}
              </span>
              <div className="home-user__details">
                <strong>{user.fullName}</strong>
                <span>{formatRole(user.role)}</span>
              </div>
            </section>

            <nav className="home-mobile-sheet__nav" aria-label="Mas modulos">
              {secondaryModules.map((module) => (
                <HomeModuleButton
                  key={module.id}
                  module={module}
                  isActive={false}
                  variant="sheet"
                  onClick={closeMore}
                />
              ))}
            </nav>

            <SessionLogoutButton
              className="home-mobile-sheet__logout"
              onLogoutSuccess={onLogoutSuccess}
            />
          </section>
        </div>
      ) : null}
    </>
  );
}

type HomeModuleButtonProps = {
  module: HomeModule;
  isActive: boolean;
  variant: "desktop" | "mobile" | "sheet";
  onClick?: () => void;
};

function HomeModuleButton({ module, isActive, variant, onClick }: HomeModuleButtonProps) {
  return (
    <button
      className={
        isActive
          ? `module-button module-button--${variant} module-button--active`
          : `module-button module-button--${variant}`
      }
      type="button"
      aria-label={module.label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      <span className="module-button__icon" aria-hidden="true">
        {module.icon}
      </span>
      <span className="module-button__label">{module.label}</span>
    </button>
  );
}

type SessionLogoutButtonProps = {
  className: string;
  onLogoutSuccess: () => void;
};

function SessionLogoutButton({ className, onLogoutSuccess }: SessionLogoutButtonProps) {
  const logoutMutation = useLogoutMutation();

  return (
    <button
      className={className}
      disabled={logoutMutation.isPending}
      type="button"
      onClick={() => {
        logoutMutation.mutate(undefined, {
          onSuccess: () => {
            onLogoutSuccess();
          },
        });
      }}
    >
      <LogoutIcon />
      <span>{logoutMutation.isPending ? "Cerrando..." : "Cerrar sesion"}</span>
    </button>
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
      <span className="brand-lockup__name">CuidarTe</span>
    </div>
  );
}

function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => getMediaQueryMatches(query));

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const mediaQueryList = window.matchMedia(query);
    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    setMatches(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", handleChange);

    return () => {
      mediaQueryList.removeEventListener("change", handleChange);
    };
  }, [query]);

  return matches;
}

function getMediaQueryMatches(query: string): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia(query).matches;
}

function canViewModule(module: HomeModule, role: AuthUser["role"]): boolean {
  return module.roles === undefined || module.roles.includes(role);
}

function isMobilePrimaryModule(module: HomeModule): boolean {
  return MOBILE_PRIMARY_MODULE_IDS.includes(
    module.id as (typeof MOBILE_PRIMARY_MODULE_IDS)[number],
  );
}

function formatRole(role: AuthUser["role"]): string {
  return ROLE_LABELS[role];
}

function getInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase() ?? "")
    .join("");

  return initials === "" ? "CT" : initials;
}

function HomeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M4.75 10.8 12 4.75l7.25 6.05v7.7a1.75 1.75 0 0 1-1.75 1.75H6.5a1.75 1.75 0 0 1-1.75-1.75v-7.7Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.75 20.25v-5.5h4.5v5.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function OlderAdultsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M8.25 10.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5ZM15.75 10.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M3.75 19.75v-1a4.5 4.5 0 0 1 9 0v1M11.25 19.75v-1a4.5 4.5 0 0 1 9 0v1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function GroupSessionsIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M6.5 7.75h11A2.75 2.75 0 0 1 20.25 10.5v3A2.75 2.75 0 0 1 17.5 16.25H13l-4.25 3v-3H6.5A2.75 2.75 0 0 1 3.75 13.5v-3A2.75 2.75 0 0 1 6.5 7.75Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 11.75h8M8 14h5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M6.75 4.75h10.5A2.5 2.5 0 0 1 19.75 7.25v10.5a2.5 2.5 0 0 1-2.5 2.5H6.75a2.5 2.5 0 0 1-2.5-2.5V7.25a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M8 12h8M12 8v8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MealIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M6.75 4.75v15.5M10 4.75v6.5a3.25 3.25 0 0 1-6.5 0v-6.5M16.5 4.75c2.2.92 3.75 3.1 3.75 5.64v9.86M16.5 4.75v15.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EmployeesIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M12 11.25a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM5.25 20.25v-1.1a6.75 6.75 0 0 1 13.5 0v1.1"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M17.75 8.25h3.5M19.5 6.5V10"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function BackOfficeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M4.75 8.25h14.5M7.25 4.75h9.5a2.5 2.5 0 0 1 2.5 2.5v9.5a2.5 2.5 0 0 1-2.5 2.5h-9.5a2.5 2.5 0 0 1-2.5-2.5v-9.5a2.5 2.5 0 0 1 2.5-2.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.25 13h5.5M9.25 16h3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M5.75 12h.01M12 12h.01M18.25 12h.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
      <path
        d="M4.75 6.75h14.5M4.75 17.25h14.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M6.75 6.75 17.25 17.25M17.25 6.75 6.75 17.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.9"
      />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M9.75 5.25H6.5a1.75 1.75 0 0 0-1.75 1.75v10A1.75 1.75 0 0 0 6.5 18.75h3.25M14.25 8.25 18 12l-3.75 3.75M17.5 12H9.25"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}
