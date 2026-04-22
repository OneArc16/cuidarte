import { type AuthUser } from "@cuidarte/contracts";

import { formatRole } from "../lib/home-formatters";

export function HomeDashboard({ user }: { user: AuthUser }) {
  return (
    <>
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
    </>
  );
}
