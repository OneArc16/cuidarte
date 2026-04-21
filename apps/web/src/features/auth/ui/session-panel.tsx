import { type AuthUser } from "@cuidarte/contracts";

import { useLogoutMutation } from "../model/auth-queries";

type SessionPanelProps = {
  user: AuthUser;
};

export function SessionPanel({ user }: SessionPanelProps) {
  const logoutMutation = useLogoutMutation();

  return (
    <section className="session-panel" aria-label="Sesion activa">
      <div>
        <p className="eyebrow">Sesion activa</p>
        <h2>{user.fullName}</h2>
        <p className="session-panel__meta">
          {user.email} · {formatRole(user.role)}
        </p>
      </div>

      <div className="session-panel__details">
        <span>Tenant</span>
        <strong>{user.tenantId ?? "BackOffice"}</strong>
      </div>

      <div className="session-panel__details">
        <span>Contrasena</span>
        <strong>{user.passwordSetByAdmin ? "Asignada por admin" : "Actualizada por usuario"}</strong>
      </div>

      <button
        className="secondary-action"
        disabled={logoutMutation.isPending}
        type="button"
        onClick={() => logoutMutation.mutate()}
      >
        {logoutMutation.isPending ? "Cerrando..." : "Cerrar sesion"}
      </button>
    </section>
  );
}

function formatRole(role: AuthUser["role"]): string {
  const labels = {
    super_admin: "SuperAdmin",
    tenant_admin: "Admin de tenant",
    employee: "Empleado",
  } satisfies Record<AuthUser["role"], string>;

  return labels[role];
}
