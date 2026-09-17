import { ChevronLeft } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { ADULTOS_MAYORES_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";

import { AtencionIndividualForm } from "../components/atencion-individual-form";
import { resolveAtencionIndividualApiError } from "../lib/atenciones-individuales-formatters";
import {
  buildAtencionIndividualDetailPath,
  buildHistoriaClinicaPath,
} from "../lib/atenciones-individuales-paths";
import { buildAtencionEnfermeriaDetailPath } from "@/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths";
import {
  useAtencionIndividualQuery,
  useUpdateAtencionIndividualMutation,
} from "../model/atenciones-individuales-queries";

type AtencionIndividualDetailPageProps = {
  atencionId: string;
  navigate: Navigate;
};

export function AtencionIndividualDetailPage({
  atencionId,
  navigate,
}: AtencionIndividualDetailPageProps) {
  const atencionQuery = useAtencionIndividualQuery(atencionId);
  const updateMutation = useUpdateAtencionIndividualMutation(atencionId);

  useEffect(() => {
    if (!updateMutation.isSuccess) {
      return;
    }

    toast.success("Atencion individual guardada.");
    updateMutation.reset();
  }, [updateMutation]);

  if (atencionQuery.isLoading) {
    return (
      <section className="adultos-empty" aria-busy="true">
        <p className="eyebrow">Atencion individual</p>
        <h2>Cargando atencion...</h2>
      </section>
    );
  }

  if (atencionQuery.isError || atencionQuery.data === undefined) {
    return (
      <section className="adultos-empty" aria-labelledby="atencion-detail-error-title">
        <p className="eyebrow">Atencion individual</p>
        <h2 id="atencion-detail-error-title">No fue posible cargar la atencion</h2>
        <p>{resolveAtencionIndividualApiError(atencionQuery.error)}</p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(ADULTOS_MAYORES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  const access = atencionQuery.data.access;
  const historyPath = buildHistoriaClinicaPath(atencionQuery.data.adultoMayorId);
  const returnPath = buildAtencionIndividualDetailPath(atencionQuery.data.adultoMayorId, atencionId);

  if (access === null) {
    return (
      <section className="adultos-empty" aria-labelledby="atencion-detail-forbidden-title">
        <p className="eyebrow">Atencion individual</p>
        <h2 id="atencion-detail-forbidden-title">No tienes permisos para consultar esta atencion</h2>
        <button className="outline-action" type="button" onClick={() => navigate(historyPath)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  const isEditable = access === "edit";

  return (
    <section className="adultos-form-stack" aria-labelledby="atencion-detail-title">
      <h1 className="visually-hidden" id="atencion-detail-title">
        Atencion individual
      </h1>

      <div className="adultos-form-nav">
        <button
          className="outline-action adultos-back-action"
          type="button"
          onClick={() => navigate(historyPath)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="adultos-form-nav__context">
          Atencion #{atencionQuery.data.consecutive}
        </span>
      </div>

      {!isEditable ? (
        <p className="atencion-readonly-banner" role="status">
          Vista de solo lectura. Esta atencion no se puede editar desde tu rol.
        </p>
      ) : null}

      {isEditable ? (
        <AtencionIndividualForm
          mode="edit"
          detail={atencionQuery.data}
          isPending={updateMutation.isPending}
          error={
            updateMutation.error === null
              ? null
              : resolveAtencionIndividualApiError(updateMutation.error)
          }
          onCancel={() => navigate(historyPath)}
          onOpenNursingAttention={(atencionId) =>
            navigate(buildAtencionEnfermeriaDetailPath(atencionId), {
              state: { returnTo: returnPath },
            })
          }
          onSubmit={async (values) => {
            await updateMutation.mutateAsync(values);
          }}
        />
      ) : (
        <AtencionIndividualForm
          mode="view"
          detail={atencionQuery.data}
          onCancel={() => navigate(historyPath)}
          onOpenNursingAttention={(atencionId) =>
            navigate(buildAtencionEnfermeriaDetailPath(atencionId), {
              state: { returnTo: returnPath },
            })
          }
        />
      )}
    </section>
  );
}
