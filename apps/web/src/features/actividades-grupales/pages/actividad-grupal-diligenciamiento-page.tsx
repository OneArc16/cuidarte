import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadGrupalDiligenciamientoForm } from "../components/actividad-grupal-diligenciamiento-form";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import {
  useActividadGrupalDiligenciamientoQuery,
  useSaveActividadGrupalDiligenciamientoMutation,
} from "../model/actividades-grupales-queries";

type ActividadGrupalDiligenciamientoPageProps = {
  activityId: string;
  navigate: Navigate;
};

export function ActividadGrupalDiligenciamientoPage({
  activityId,
  navigate,
}: ActividadGrupalDiligenciamientoPageProps) {
  const detailQuery = useActividadGrupalDiligenciamientoQuery(activityId);
  const saveMutation = useSaveActividadGrupalDiligenciamientoMutation();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (detailQuery.isLoading) {
    return (
      <section className="actividades-empty" aria-busy="true">
        <p className="eyebrow">Sesiones grupales</p>
        <h2>Cargando diligenciamiento...</h2>
      </section>
    );
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    return (
      <section
        className="actividades-empty"
        aria-labelledby="actividad-diligenciamiento-error-title"
      >
        <p className="eyebrow">Sesiones grupales</p>
        <h2 id="actividad-diligenciamiento-error-title">
          No fue posible cargar el diligenciamiento
        </h2>
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
    <section className="actividades-form-stack" aria-labelledby="actividad-diligenciamiento-title">
      <h1 className="visually-hidden" id="actividad-diligenciamiento-title">
        Diligenciar sesion grupal
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
        <span className="actividades-form-nav__context">Diligenciar sesion</span>
      </div>

      {successMessage !== null ? (
        <p className="success-banner" role="status">
          {successMessage}
        </p>
      ) : null}

      <ActividadGrupalDiligenciamientoForm
        activityId={activityId}
        detail={detailQuery.data}
        error={resolveActividadesGrupalesApiError(saveMutation.error)}
        isPending={saveMutation.isPending}
        onCancel={() => navigate(CREACION_ACTIVIDADES_PATH)}
        onSubmit={(request) => {
          setSuccessMessage(null);
          saveMutation.mutate(
            {
              activityId,
              ...request,
            },
            {
              onSuccess: () => {
                setSuccessMessage("Diligenciamiento guardado.");
              },
            },
          );
        }}
      />
    </section>
  );
}
