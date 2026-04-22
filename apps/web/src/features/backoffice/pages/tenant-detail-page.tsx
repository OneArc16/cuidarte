import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { BackofficeTenantForm } from "../components/tenant-form";
import { BackofficeTopBar } from "../components/backoffice-top-bar";
import { BACKOFFICE_PATH } from "../lib/backoffice-paths";
import { resolveApiError } from "../lib/backoffice-formatters";
import {
  useBackofficeTenantQuery,
  useUpdateBackofficeTenantMutation,
} from "../model/backoffice-queries";

type BackofficeTenantDetailPageProps = {
  navigate: Navigate;
  tenantId: string;
};

export function BackofficeTenantDetailPage({
  navigate,
  tenantId,
}: BackofficeTenantDetailPageProps) {
  const tenantQuery = useBackofficeTenantQuery(tenantId);
  const updateMutation = useUpdateBackofficeTenantMutation(tenantId);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (tenantQuery.isLoading) {
    return (
      <section className="backoffice-empty" aria-busy="true">
        <p className="eyebrow">BackOffice</p>
        <h2>Cargando tenant...</h2>
      </section>
    );
  }

  if (tenantQuery.isError || tenantQuery.data === undefined) {
    return (
      <section className="backoffice-empty" aria-labelledby="backoffice-detail-error-title">
        <p className="eyebrow">BackOffice</p>
        <h2 id="backoffice-detail-error-title">No fue posible cargar el tenant</h2>
        <p className="form-error" role="alert">
          {resolveApiError(tenantQuery.error)}
        </p>
        <button className="outline-action" type="button" onClick={() => navigate(BACKOFFICE_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  return (
    <section className="backoffice-stack" aria-labelledby="backoffice-detail-title">
      <BackofficeTopBar
        eyebrow="Tenant"
        title={tenantQuery.data.tenant.name}
        onBack={() => navigate(BACKOFFICE_PATH)}
      />

      {successMessage !== null ? (
        <p className="success-banner" role="status">
          {successMessage}
        </p>
      ) : null}

      <BackofficeTenantForm
        mode="edit"
        detail={tenantQuery.data}
        isPending={updateMutation.isPending}
        error={resolveApiError(updateMutation.error)}
        onSubmit={(values) => {
          setSuccessMessage(null);
          updateMutation.mutate(values, {
            onSuccess: () => {
              setSuccessMessage("Cambios guardados.");
            },
          });
        }}
      />
    </section>
  );
}
