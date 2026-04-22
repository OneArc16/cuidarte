import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { BackofficeTenantForm } from "../components/tenant-form";
import { BACKOFFICE_PATH } from "../lib/backoffice-paths";
import { resolveApiError } from "../lib/backoffice-formatters";
import { useCreateBackofficeTenantMutation } from "../model/backoffice-queries";

export function BackofficeTenantCreatePage({ navigate }: { navigate: Navigate }) {
  const createMutation = useCreateBackofficeTenantMutation();

  return (
    <section
      className="backoffice-stack backoffice-stack--form"
      aria-labelledby="backoffice-create-title"
    >
      <h1 className="visually-hidden" id="backoffice-create-title">
        Nuevo tenant
      </h1>
      <div className="backoffice-form-nav">
        <button
          className="outline-action backoffice-back-action"
          type="button"
          onClick={() => navigate(BACKOFFICE_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="backoffice-form-nav__context">Nuevo tenant</span>
      </div>

      <BackofficeTenantForm
        mode="create"
        isPending={createMutation.isPending}
        error={resolveApiError(createMutation.error)}
        onSubmit={(values) => {
          createMutation.mutate(values, {
            onSuccess: (detail) => {
              navigate(`${BACKOFFICE_PATH}/tenants/${detail.tenant.id}`);
            },
          });
        }}
      />
    </section>
  );
}
