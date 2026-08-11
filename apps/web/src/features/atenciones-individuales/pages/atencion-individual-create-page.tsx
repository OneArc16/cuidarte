import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AtencionIndividualForm } from "../components/atencion-individual-form";
import {
  buildAtencionIndividualDetailPath,
  buildHistoriaClinicaPath,
} from "../lib/atenciones-individuales-paths";
import { resolveAtencionIndividualApiError } from "../lib/atenciones-individuales-formatters";
import {
  useAtencionIndividualAdultoLookupQuery,
  useCreateAtencionIndividualMutation,
} from "../model/atenciones-individuales-queries";

type AtencionIndividualCreatePageProps = {
  adultoMayorId: string;
  navigate: Navigate;
};

export function AtencionIndividualCreatePage({
  adultoMayorId,
  navigate,
}: AtencionIndividualCreatePageProps) {
  const lookupQuery = useAtencionIndividualAdultoLookupQuery(adultoMayorId);
  const createMutation = useCreateAtencionIndividualMutation();
  const historyPath = buildHistoriaClinicaPath(adultoMayorId);

  if (lookupQuery.isLoading) {
    return (
      <section className="adultos-empty" aria-busy="true">
        <p className="eyebrow">Atencion individual</p>
        <h2>Cargando adulto mayor...</h2>
      </section>
    );
  }

  if (lookupQuery.isError || lookupQuery.data === undefined) {
    return (
      <section className="adultos-empty" aria-labelledby="atencion-lookup-error-title">
        <p className="eyebrow">Atencion individual</p>
        <h2 id="atencion-lookup-error-title">No fue posible iniciar la atencion</h2>
        <p>{resolveAtencionIndividualApiError(lookupQuery.error)}</p>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(historyPath)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  return (
    <section className="adultos-form-stack" aria-labelledby="atencion-create-title">
      <h1 className="visually-hidden" id="atencion-create-title">
        Formulario de nueva atencion individual
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
        <span className="adultos-form-nav__context">Nueva atencion individual</span>
      </div>

      <AtencionIndividualForm
        mode="create"
        adultoMayor={lookupQuery.data.adultoMayor}
        suggestedConsecutive={lookupQuery.data.suggestedConsecutive}
        isPending={createMutation.isPending}
        error={
          createMutation.error === null
            ? null
            : resolveAtencionIndividualApiError(createMutation.error)
        }
        onCancel={() => navigate(historyPath)}
        onSubmit={async (values) => {
          const detail = await createMutation.mutateAsync(values);

          navigate(buildAtencionIndividualDetailPath(detail.adultoMayorId, detail.id), {
            replace: true,
          });
        }}
      />
    </section>
  );
}
