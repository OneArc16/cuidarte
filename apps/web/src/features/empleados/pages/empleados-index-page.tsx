import { type AuthUser } from "@cuidarte/contracts";
import { Plus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { EmpleadoDetailModal } from "../components/empleado-detail-modal";
import { EmpleadosTable } from "../components/empleados-table";
import { EmpleadosToolbar } from "../components/empleados-toolbar";
import { buildEmpleadoEditPath, EMPLEADOS_NEW_PATH } from "../lib/empleados-paths";
import { canCreateEmpleados, canEditEmpleados } from "../lib/empleados-permissions";
import { resolveEmpleadosApiError } from "../lib/empleados-formatters";
import { useEmpleadosQuery } from "../model/empleados-queries";

type EmpleadosIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function EmpleadosIndexPage({ navigate, user }: EmpleadosIndexPageProps) {
  const [search, setSearch] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);
  const empleadosQuery = useEmpleadosQuery({ search });
  const empleados = empleadosQuery.data?.empleados ?? [];
  const showTenantColumn = user.role === "super_admin";
  const canCreateUsers = canCreateEmpleados(user);
  const canEditUsers = canEditEmpleados(user);

  return (
    <section className="empleados-stack" aria-labelledby="empleados-title">
      <h1 className="visually-hidden" id="empleados-title">
        Gestion de empleados
      </h1>

      <EmpleadosToolbar search={search} onSearchChange={setSearch} />

      {empleadosQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveEmpleadosApiError(empleadosQuery.error)}
        </p>
      ) : null}

      <EmpleadosTable
        canEditEmpleados={canEditUsers}
        empleados={empleados}
        isLoading={empleadosQuery.isLoading}
        showTenantColumn={showTenantColumn}
        onEdit={(empleadoId) => navigate(buildEmpleadoEditPath(empleadoId))}
        onView={setSelectedEmpleadoId}
      />

      {canCreateUsers ? (
        <button
          className="empleados-floating-action"
          type="button"
          aria-label="Crear usuario"
          title="Crear usuario"
          onClick={() => navigate(EMPLEADOS_NEW_PATH)}
        >
          <Plus aria-hidden="true" />
        </button>
      ) : null}

      {selectedEmpleadoId !== null ? (
        <EmpleadoDetailModal
          empleadoId={selectedEmpleadoId}
          showTenant={showTenantColumn}
          onClose={() => setSelectedEmpleadoId(null)}
        />
      ) : null}
    </section>
  );
}
