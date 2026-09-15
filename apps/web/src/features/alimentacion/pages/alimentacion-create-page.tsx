import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { ApiError } from "@/shared/api/api-error";

import { AlimentacionBatchForm } from "../components/alimentacion-batch-form";
import { REGISTRO_ALIMENTACION_PATH, buildAlimentacionEditPath } from "../lib/alimentacion-paths";
import {
  getTodayDateInputValue,
  resolveAlimentacionApiError,
} from "../lib/alimentacion-formatters";
import {
  useAlimentacionAdultoMayorLookupQuery,
  useAlimentacionTenantOptionsQuery,
  useCreateAlimentacionBatchMutation,
} from "../model/alimentacion-queries";

type AlimentacionCreatePageProps = {
  adultoMayorId: string | null;
  navigate: Navigate;
  user: AuthUser;
};

export function AlimentacionCreatePage({
  adultoMayorId,
  navigate,
  user,
}: AlimentacionCreatePageProps) {
  const shouldSelectTenant = user.role === "super_admin";
  const [selectedTenantId, setSelectedTenantId] = useState(
    shouldSelectTenant ? "" : (user.tenantId ?? ""),
  );
  const tenantOptionsQuery = useAlimentacionTenantOptionsQuery(shouldSelectTenant);
  const lookupQuery = useAlimentacionAdultoMayorLookupQuery(
    adultoMayorId,
    getTodayDateInputValue(),
    adultoMayorId !== null,
  );
  const createMutation = useCreateAlimentacionBatchMutation();

  useEffect(() => {
    if (
      lookupQuery.data?.existingRecordId !== null &&
      lookupQuery.data?.existingRecordId !== undefined
    ) {
      toast.warning(
        "Este adulto mayor ya tiene un registro de alimentación para el día seleccionado.",
      );
      navigate(buildAlimentacionEditPath(lookupQuery.data.existingRecordId), { replace: true });
    }
  }, [lookupQuery.data?.existingRecordId, navigate]);

  useEffect(() => {
    if (!shouldSelectTenant) {
      return;
    }

    const tenantId = lookupQuery.data?.adultoMayor.tenantId;

    if (tenantId !== undefined && tenantId !== "") {
      setSelectedTenantId((currentTenantId) =>
        currentTenantId === "" ? tenantId : currentTenantId,
      );
    }
  }, [lookupQuery.data?.adultoMayor.tenantId, shouldSelectTenant]);

  return (
    <section className="alimentacion-form-stack" aria-labelledby="alimentacion-create-title">
      <h1 className="visually-hidden" id="alimentacion-create-title">
        Nuevo registro de alimentación
      </h1>

      <div className="alimentacion-form-nav">
        <button
          className="outline-action alimentacion-back-action"
          type="button"
          onClick={() => navigate(REGISTRO_ALIMENTACION_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="alimentacion-form-nav__context">Nuevo registro</span>
      </div>

      <AlimentacionBatchForm
        error={
          resolveAlimentacionApiError(createMutation.error) ??
          resolveAlimentacionApiError(lookupQuery.error) ??
          resolveAlimentacionApiError(tenantOptionsQuery.error)
        }
        isPending={createMutation.isPending}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        prefilledAdultoMayor={
          lookupQuery.data?.existingRecordId === null ? lookupQuery.data.adultoMayor : null
        }
        selectedTenantId={selectedTenantId}
        shouldSelectTenant={shouldSelectTenant}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        onCancel={() => navigate(REGISTRO_ALIMENTACION_PATH)}
        onSubmit={(request) => {
          createMutation.mutate(request, {
            onSuccess: () => {
              navigate(REGISTRO_ALIMENTACION_PATH);
            },
            onError: (error) => {
              if (error instanceof ApiError && error.status === 409) {
                toast.warning(
                  "Uno o más adultos mayores ya tienen alimentos registrados para el día seleccionado.",
                );
              }
            },
          });
        }}
        onTenantChange={setSelectedTenantId}
      />
    </section>
  );
}
