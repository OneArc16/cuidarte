import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadGrupalForm } from "../components/actividad-grupal-form";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import {
  useActividadGrupalFormOptionsQuery,
  useActividadGrupalTenantOptionsQuery,
  useCreateActividadGrupalMutation,
} from "../model/actividades-grupales-queries";

type ActividadGrupalCreatePageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function ActividadGrupalCreatePage({ navigate, user }: ActividadGrupalCreatePageProps) {
  const shouldSelectTenant = user.role === "super_admin";
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const effectiveTenantId = shouldSelectTenant ? selectedTenantId || null : user.tenantId;
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(shouldSelectTenant);
  const formOptionsQuery = useActividadGrupalFormOptionsQuery(
    effectiveTenantId,
    effectiveTenantId !== null,
  );
  const createMutation = useCreateActividadGrupalMutation();

  return (
    <section className="actividades-form-stack" aria-labelledby="actividad-create-title">
      <h1 className="visually-hidden" id="actividad-create-title">
        Nueva actividad grupal
      </h1>

      <div className="actividades-form-nav">
        <button
          className="outline-action actividades-back-action"
          type="button"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="actividades-form-nav__context">Nueva actividad</span>
      </div>

      <ActividadGrupalForm
        error={
          resolveActividadesGrupalesApiError(createMutation.error) ??
          (shouldSelectTenant
            ? resolveActividadesGrupalesApiError(tenantOptionsQuery.error)
            : null) ??
          resolveActividadesGrupalesApiError(formOptionsQuery.error)
        }
        formOptions={formOptionsQuery.data ?? null}
        isFormOptionsLoading={formOptionsQuery.isLoading}
        isPending={createMutation.isPending}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        selectedTenantId={selectedTenantId}
        shouldSelectTenant={shouldSelectTenant}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        onCancel={() => navigate(CREACION_ACTIVIDADES_PATH)}
        onTenantChange={setSelectedTenantId}
        onSubmit={(values) => {
          createMutation.mutate(values, {
            onSuccess: () => {
              navigate(CREACION_ACTIVIDADES_PATH);
            },
          });
        }}
      />
    </section>
  );
}
