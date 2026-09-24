import { ChevronLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { type AuthUser } from "@cuidarte/contracts";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadGrupalForm } from "../components/actividad-grupal-form";
import { ActividadGrupalActaCorrectionDialog } from "../components/actividad-grupal-acta-correction-dialog";
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
  useCorrectActividadGrupalActaNumberMutation,
} from "../model/actividades-grupales-queries";

type ActividadGrupalEditPageProps = {
  activityId: string;
  navigate: Navigate;
  user: AuthUser;
};

export function ActividadGrupalEditPage({
  activityId,
  navigate,
  user,
}: ActividadGrupalEditPageProps) {
  const detailQuery = useActividadGrupalEditQuery(activityId);
  const tenantId = detailQuery.data?.tenantId ?? null;
  const formOptionsQuery = useActividadGrupalFormOptionsQuery(tenantId, tenantId !== null);
  const updateMutation = useUpdateActividadGrupalMutation();
  const correctionMutation = useCorrectActividadGrupalActaNumberMutation();
  const [showCorrection, setShowCorrection] = useState(false);

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
        {user.role === "super_admin" ? (
          <button
            className="outline-action"
            type="button"
            onClick={() => {
              correctionMutation.reset();
              setShowCorrection(true);
            }}
          >
            <RefreshCw aria-hidden="true" />
            <span>Corregir consecutivo</span>
          </button>
        ) : null}
      </div>

      <ActividadGrupalForm
        mode="edit"
        user={user}
        error={
          resolveActividadesGrupalesApiError(updateMutation.error) ??
          resolveActividadesGrupalesApiError(formOptionsQuery.error)
        }
        formOptions={formOptionsQuery.data ?? null}
        currentActivityType={detailQuery.data.activityTypeCatalog}
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
      {showCorrection ? (
        <ActividadGrupalActaCorrectionDialog
          activity={detailQuery.data}
          errorMessage={resolveActividadesGrupalesApiError(correctionMutation.error)}
          isPending={correctionMutation.isPending}
          onClose={() => {
            if (!correctionMutation.isPending) setShowCorrection(false);
          }}
          onConfirm={(organizer, reason) =>
            correctionMutation.mutate(
              { activityId, payload: { organizer, reason } },
              {
                onSuccess: () => {
                  setShowCorrection(false);
                  toast.success("Consecutivo corregido.");
                },
              },
            )
          }
        />
      ) : null}
    </section>
  );
}
