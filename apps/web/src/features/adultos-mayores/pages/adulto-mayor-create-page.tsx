import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AdultoMayorForm } from "../components/adulto-mayor-form";
import { resolveAdultosMayoresApiError } from "../lib/adultos-mayores-formatters";
import { ADULTOS_MAYORES_PATH, buildAdultoMayorEditPath } from "../lib/adultos-mayores-paths";
import {
  useAdultoMayorTenantOptionsQuery,
  useCreateAdultoMayorMutation,
} from "../model/adultos-mayores-queries";

type AdultoMayorCreatePageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function AdultoMayorCreatePage({ navigate, user }: AdultoMayorCreatePageProps) {
  const shouldSelectTenant = user.role === "super_admin";
  const tenantOptionsQuery = useAdultoMayorTenantOptionsQuery(shouldSelectTenant);
  const createMutation = useCreateAdultoMayorMutation();
  const tenantOptions = tenantOptionsQuery.data?.tenants ?? [];
  const queryError = shouldSelectTenant
    ? resolveAdultosMayoresApiError(tenantOptionsQuery.error)
    : null;
  const mutationError = resolveAdultosMayoresApiError(createMutation.error);

  return (
    <section className="adultos-form-stack" aria-labelledby="adulto-create-title">
      <h1 className="visually-hidden" id="adulto-create-title">
        Nuevo adulto mayor
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="adultos-form-nav__context">Nuevo adulto mayor</span>
      </div>

      <AdultoMayorForm
        mode="create"
        areTenantOptionsLoading={tenantOptionsQuery.isLoading}
        shouldSelectTenant={shouldSelectTenant}
        tenantOptions={tenantOptions}
        isPending={createMutation.isPending}
        error={mutationError ?? queryError}
        onCancel={() => navigate(ADULTOS_MAYORES_PATH)}
        onSubmit={async (values) => {
          const detail = await createMutation.mutateAsync(values);

          toast.success("Adulto mayor creado.");
          navigate(buildAdultoMayorEditPath(detail.id));
        }}
      />
    </section>
  );
}
