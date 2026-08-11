import { ChevronLeft } from "lucide-react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadGrupalForm } from "../components/actividad-grupal-form";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import {
  toActividadGrupalFormValues,
  toUpdateActividadGrupalRequest,
} from "../schemas/actividad-grupal-form.schema";
import {
  useActividadGrupalEditQuery,
  useActividadGrupalFormOptionsQuery,
  useUpdateActividadGrupalMutation,
} from "../model/actividades-grupales-queries";

type ActividadGrupalEditPageProps = {
  activityId: string;
  navigate: Navigate;
};

export function ActividadGrupalEditPage({
  activityId,
  navigate,
}: ActividadGrupalEditPageProps) {
  const detailQuery = useActividadGrupalEditQuery(activityId);
  const tenantId = detailQuery.data?.tenantId ?? null;
  const formOptionsQuery = useActividadGrupalFormOptionsQuery(tenantId, tenantId !== null);
  const updateMutation = useUpdateActividadGrupalMutation();

  if (detailQuery.isLoading) {
    return (
      <section className="actividades-empty" aria-busy="true">
        <p className="eyebrow">Sesiones grupales</p>
        <h2>Cargando actividad...</h2>
      </section>
    );
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    return (
      <section className="actividades-empty" aria-labelledby="actividad-edit-error-title">
        <p className="eyebrow">Sesiones grupales</p>
        <h2 id="actividad-edit-error-title">No fue posible cargar la actividad</h2>
        <p className="form-error" role="alert">
          {resolveActividadesGrupalesApiError(detailQuery.error)}
        </p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  return (
    <section className="actividades-form-stack" aria-labelledby="actividad-edit-title">
      <h1 className="visually-hidden" id="actividad-edit-title">
        Editar actividad grupal
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
        <span className="actividades-form-nav__context">Editar actividad</span>
      </div>

      <ActividadGrupalForm
        mode="edit"
        error={
          resolveActividadesGrupalesApiError(updateMutation.error) ??
          resolveActividadesGrupalesApiError(formOptionsQuery.error)
        }
        formOptions={formOptionsQuery.data ?? null}
        initialValues={toActividadGrupalFormValues(detailQuery.data)}
        isFormOptionsLoading={formOptionsQuery.isLoading}
        isPending={updateMutation.isPending}
        isTenantOptionsLoading={false}
        selectedTenantId={detailQuery.data.tenantId}
        shouldSelectTenant={false}
        tenantOptions={[]}
        onCancel={() => navigate(CREACION_ACTIVIDADES_PATH)}
        onTenantChange={() => undefined}
        onSubmit={(values) => {
          updateMutation.mutate(
            {
              activityId,
              payload: toUpdateActividadGrupalRequest(values),
            },
            {
              onSuccess: () => {
                toast.success("Actividad actualizada.");
                navigate(CREACION_ACTIVIDADES_PATH);
              },
            },
          );
        }}
      />
    </section>
  );
}
