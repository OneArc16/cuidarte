import { useQuery } from "@tanstack/react-query";

import { LoginForm } from "../features/auth/ui/login-form";
import { SessionPanel } from "../features/auth/ui/session-panel";
import { useCurrentUserQuery } from "../features/auth/model/auth-queries";
import { getHealth } from "../features/health/api/get-health";

export function App() {
  const currentUserQuery = useCurrentUserQuery();
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: 1,
  });

  const isOnline = healthQuery.data?.status === "ok";
  const statusLabel = isOnline ? "API conectada" : "Validando API";
  const user = currentUserQuery.data?.user ?? null;

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
        </div>
      </section>

      <section className="auth-layout" aria-label="Acceso a Cuidarte">
        <div>
          <p className="auth-layout__label">Vertical slice auth</p>
          <h2>{user === null ? "Acceso seguro por correo y contrasena." : "Sesion validada."}</h2>
          <p className="auth-layout__copy">
            La contrasena inicial la asigna el administrador. El usuario podra cambiarla
            manualmente desde su configuracion de sesion.
          </p>
        </div>

        {currentUserQuery.isLoading ? (
          <section className="login-card" aria-busy="true">
            <p className="auth-loading__title">Validando sesion...</p>
          </section>
        ) : user === null ? (
          <section className="login-card" aria-label="Formulario de inicio de sesion">
            <div className="login-card__header">
              <p className="eyebrow">Ingreso</p>
              <h2>Bienvenido</h2>
              <p>Usa el correo y contrasena asignados por el administrador.</p>
            </div>
            <LoginForm />
          </section>
        ) : (
          <SessionPanel user={user} />
        )}
      </section>

      <section className="health-strip" aria-label="Estado del backend">
        <span className={isOnline ? "health-dot health-dot--ok" : "health-dot"} />
        <p>
          <strong>{healthQuery.isError ? "API no disponible" : statusLabel}</strong>
          <span>
            {healthQuery.isError
              ? " Revisa que apps/api este corriendo en el puerto 3001."
              : ` ${healthQuery.data?.timestamp ?? "Esperando respuesta del backend."}`}
          </span>
        </p>
      </section>
    </main>
  );
}
