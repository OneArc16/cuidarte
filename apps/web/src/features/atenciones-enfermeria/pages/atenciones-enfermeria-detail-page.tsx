import { ChevronLeft, HeartPulse } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AtencionesEnfermeriaForm } from "../components/atenciones-enfermeria-form";
import { resolveAtencionesEnfermeriaApiError } from "../lib/atenciones-enfermeria-formatters";
import {
  ATENCIONES_ENFERMERIA_PATH,
  buildAtencionesEnfermeriaHistoryPath,
} from "../lib/atenciones-enfermeria-paths";
import { buildAtencionIndividualDetailPath } from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";
import {
  useAtencionEnfermeriaQuery,
  useUpdateAtencionEnfermeriaMutation,
} from "../model/atenciones-enfermeria-queries";
import { toUpdateAtencionEnfermeriaRequest } from "../schemas/atenciones-enfermeria-form.schema";

type AtencionesEnfermeriaDetailPageProps = {
  atencionId: string;
  navigate: Navigate;
};

export function AtencionesEnfermeriaDetailPage({
  atencionId,
  navigate,
}: AtencionesEnfermeriaDetailPageProps) {
  const detailQuery = useAtencionEnfermeriaQuery(atencionId);
  const updateMutation = useUpdateAtencionEnfermeriaMutation(atencionId);
  const returnPath =
    typeof window.history.state?.returnTo === "string"
      ? window.history.state.returnTo
      : ATENCIONES_ENFERMERIA_PATH;

  useEffect(() => {
    if (!updateMutation.isSuccess) {
      return;
    }

    toast.success("Atencion de enfermeria guardada.");
    updateMutation.reset();
  }, [updateMutation]);

  if (detailQuery.isLoading) {
    return (
      <section className="atenciones-enfermeria-empty" aria-busy="true">
        <p className="eyebrow">Enfermería</p>
        <h2>Cargando atencion...</h2>
      </section>
    );
  }

  if (detailQuery.isError || detailQuery.data === undefined) {
    return (
      <section
        className="atenciones-enfermeria-empty"
        aria-labelledby="atenciones-enfermeria-detail-error-title"
      >
        <p className="eyebrow">Enfermería</p>
        <h2 id="atenciones-enfermeria-detail-error-title">No fue posible cargar la atencion</h2>
        <p>{resolveAtencionesEnfermeriaApiError(detailQuery.error)}</p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(returnPath)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  const detail = detailQuery.data;
  const isEditable = detail.access === "edit";

  return (
    <section
      className="atenciones-enfermeria-form-stack"
      aria-labelledby="atenciones-enfermeria-detail-title"
    >
      <h1 className="visually-hidden" id="atenciones-enfermeria-detail-title">
        Atencion de enfermeria
      </h1>

      <div className="atenciones-enfermeria-form-nav">
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(returnPath)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(buildAtencionesEnfermeriaHistoryPath(detail.adultoMayor.id))}
        >
          <HeartPulse aria-hidden="true" />
          <span>Historial del adulto</span>
        </button>
        <span className="atenciones-enfermeria-form-nav__context">
          Atencion #{detail.id.slice(0, 8)}
        </span>
      </div>

      {!isEditable ? (
        <p className="atencion-readonly-banner" role="status">
          Vista de solo lectura. Esta atencion pertenece a otro profesional.
        </p>
      ) : null}

      {isEditable ? (
        <AtencionesEnfermeriaForm
          mode="edit"
          detail={detail}
          isPending={updateMutation.isPending}
          error={
            updateMutation.error === null
              ? null
              : resolveAtencionesEnfermeriaApiError(updateMutation.error)
          }
          onCancel={() => navigate(returnPath)}
          onOpenMedicalAttention={(atencionId) =>
            navigate(buildAtencionIndividualDetailPath(detail.adultoMayor.id, atencionId))
          }
          onSubmit={async (values) => {
            const request = toUpdateAtencionEnfermeriaRequest(detail.version, values);
            await updateMutation.mutateAsync(request);
          }}
        />
      ) : (
        <AtencionesEnfermeriaForm
          mode="view"
          detail={detail}
          onCancel={() => navigate(returnPath)}
          onOpenMedicalAttention={(atencionId) =>
            navigate(buildAtencionIndividualDetailPath(detail.adultoMayor.id, atencionId))
          }
        />
      )}
    </section>
  );
}
