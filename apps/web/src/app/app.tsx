import { useQuery } from "@tanstack/react-query";

import { getHealth } from "../features/health/api/get-health";

export function App() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: getHealth,
    retry: 1,
  });

  const isOnline = healthQuery.data?.status === "ok";
  const statusLabel = isOnline ? "API conectada" : "Validando API";

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__content">
          <p className="eyebrow">Centro de Vida</p>
          <h1>Cuidarte</h1>
          <p className="hero__copy">
            Base inicial del aplicativo multi-tenant para operar cuidado, sesiones,
            alimentacion, empleados y permisos por tenant.
          </p>
        </div>
      </section>

      <section className="slice-status" aria-label="Estado de la primera vertical slice">
        <div>
          <p className="slice-status__label">Vertical slice tecnica</p>
          <h2>Web, contratos y API hablando el mismo idioma.</h2>
        </div>

        <div className="health-card">
          <span className={isOnline ? "health-dot health-dot--ok" : "health-dot"} />
          <div>
            <p className="health-card__title">
              {healthQuery.isError ? "API no disponible" : statusLabel}
            </p>
            <p className="health-card__description">
              {healthQuery.isError
                ? "Revisa que apps/api este corriendo en el puerto 3000."
                : healthQuery.data?.timestamp ?? "Esperando respuesta del backend."}
            </p>
          </div>
          <button
            className="health-card__action"
            disabled={healthQuery.isFetching}
            type="button"
            onClick={() => {
              void healthQuery.refetch();
            }}
          >
            Reintentar
          </button>
        </div>
      </section>
    </main>
  );
}
