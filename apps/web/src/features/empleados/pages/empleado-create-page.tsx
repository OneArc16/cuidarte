import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { EmpleadoForm } from "../components/empleado-form";
import { buildEmpleadoEditPath, EMPLEADOS_PATH } from "../lib/empleados-paths";
import { resolveEmpleadosApiError } from "../lib/empleados-formatters";
import { canEditEmpleados } from "../lib/empleados-permissions";
import {
  useCreateEmpleadoMutation,
  useEmpleadoTenantOptionsQuery,
} from "../model/empleados-queries";

type EmpleadoCreatePageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function EmpleadoCreatePage({ navigate, user }: EmpleadoCreatePageProps) {
  const shouldSelectTenant = user.role === "super_admin";
  const tenantOptionsQuery = useEmpleadoTenantOptionsQuery(shouldSelectTenant);
  const createMutation = useCreateEmpleadoMutation();
  const tenantOptions = tenantOptionsQuery.data?.tenants ?? [];
  const queryError = shouldSelectTenant ? resolveEmpleadosApiError(tenantOptionsQuery.error) : null;
  const mutationError = resolveEmpleadosApiError(createMutation.error);

  return (
    <section className="empleados-form-stack" aria-labelledby="empleado-create-title">
      <h1 className="visually-hidden" id="empleado-create-title">
        Nuevo usuario
      </h1>

      <div className="empleados-form-nav">
        <button
          className="outline-action empleados-back-action"
          type="button"
          onClick={() => navigate(EMPLEADOS_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="empleados-form-nav__context">Nuevo usuario</span>
      </div>

      <EmpleadoForm
        mode="create"
        areTenantOptionsLoading={tenantOptionsQuery.isLoading}
        currentUserRole={user.role}
        shouldSelectTenant={shouldSelectTenant}
        tenantOptions={tenantOptions}
        isPending={createMutation.isPending}
        error={mutationError ?? queryError}
        onCancel={() => navigate(EMPLEADOS_PATH)}
        onSubmit={(values) => {
          createMutation.mutate(values, {
            onSuccess: (detail) => {
              navigate(canEditEmpleados(user) ? buildEmpleadoEditPath(detail.id) : EMPLEADOS_PATH);
            },
          });
        }}
      />
    </section>
  );
}
