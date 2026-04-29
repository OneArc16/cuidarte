import { type AuthUser } from "@cuidarte/contracts";

import { useLogoutMutation } from "../model/auth-queries";

type SessionPanelProps = {
  user: AuthUser;
  onLogoutSuccess?: () => void;
};

export function SessionPanel({ user, onLogoutSuccess }: SessionPanelProps) {
  const logoutMutation = useLogoutMutation();

  return (
    <section className="session-panel" aria-label="Cuenta activa">
      <div>
        <p className="eyebrow">Cuenta activa</p>
        <h2>Sesion</h2>
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
        <strong>
          {user.passwordSetByAdmin ? "Asignada por admin" : "Actualizada por usuario"}
        </strong>
      </div>

      <button
        className="secondary-action"
        disabled={logoutMutation.isPending}
        type="button"
        onClick={() => {
          logoutMutation.mutate(undefined, {
            onSuccess: () => {
              onLogoutSuccess?.();
            },
          });
        }}
      >
        {logoutMutation.isPending ? "Cerrando..." : "Cerrar sesion"}
      </button>
    </section>
  );
}

function formatRole(role: AuthUser["role"]): string {
  const labels = {
    super_admin: "SuperAdmin",
    admin: "Admin",
    auditor: "Auditor",
    director: "Director",
    enfermeria: "Enfermeria",
    fisioterapeuta: "Fisioterapeuta",
    medico: "Medico",
    nutricionista: "Nutricionista",
    psicologo: "Psicologo",
    recreacionista: "Recreacionista",
    trabajadora_social: "Trabajadora Social",
  } satisfies Record<AuthUser["role"], string>;

  return labels[role];
}
