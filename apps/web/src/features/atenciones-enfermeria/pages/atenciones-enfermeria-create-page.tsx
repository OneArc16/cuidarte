import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { AtencionesEnfermeriaForm } from "../components/atenciones-enfermeria-form";
import { resolveAtencionesEnfermeriaApiError } from "../lib/atenciones-enfermeria-formatters";
import {
  ATENCIONES_ENFERMERIA_PATH,
  buildAtencionEnfermeriaDetailPath,
} from "../lib/atenciones-enfermeria-paths";
import { buildAtencionIndividualDetailPath } from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";
import {
  useAtencionesEnfermeriaAdultoLookupQuery,
  useCreateAtencionEnfermeriaMutation,
} from "../model/atenciones-enfermeria-queries";
import { toCreateAtencionEnfermeriaRequest } from "../schemas/atenciones-enfermeria-form.schema";

type AtencionesEnfermeriaCreatePageProps = {
  adultoMayorId: string;
  navigate: Navigate;
};

export function AtencionesEnfermeriaCreatePage({
  adultoMayorId,
  navigate,
}: AtencionesEnfermeriaCreatePageProps) {
  const lookupQuery = useAtencionesEnfermeriaAdultoLookupQuery(adultoMayorId);
  const createMutation = useCreateAtencionEnfermeriaMutation();

  if (lookupQuery.isLoading) {
    return (
      <section className="atenciones-enfermeria-empty" aria-busy="true">
        <p className="eyebrow">Enfermería</p>
        <h2>Cargando adulto mayor...</h2>
      </section>
    );
  }

  if (lookupQuery.isError || lookupQuery.data === undefined) {
    return (
      <section className="atenciones-enfermeria-empty" aria-labelledby="atenciones-enfermeria-create-error-title">
        <p className="eyebrow">Enfermería</p>
        <h2 id="atenciones-enfermeria-create-error-title">No fue posible iniciar la atención</h2>
        <p>{resolveAtencionesEnfermeriaApiError(lookupQuery.error)}</p>
        <button className="outline-action" type="button" onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
      </section>
    );
  }

  return (
    <section className="atenciones-enfermeria-form-stack" aria-labelledby="atenciones-enfermeria-create-title">
      <h1 className="visually-hidden" id="atenciones-enfermeria-create-title">
        Nueva atencion de enfermeria
      </h1>

      <div className="atenciones-enfermeria-form-nav">
        <button className="outline-action" type="button" onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="atenciones-enfermeria-form-nav__context">Nueva atencion</span>
      </div>

      <AtencionesEnfermeriaForm
        mode="create"
        adultoMayor={lookupQuery.data.adultoMayor}
        isPending={createMutation.isPending}
        error={createMutation.error === null ? null : resolveAtencionesEnfermeriaApiError(createMutation.error)}
        onCancel={() => navigate(ATENCIONES_ENFERMERIA_PATH)}
        onOpenMedicalAttention={(atencionId) => navigate(buildAtencionIndividualDetailPath(adultoMayorId, atencionId))}
        onSubmit={async (values) => {
          const request = toCreateAtencionEnfermeriaRequest(adultoMayorId, values);
          const detail = await createMutation.mutateAsync(request);

          navigate(buildAtencionEnfermeriaDetailPath(detail.id), { replace: true });
        }}
      />
    </section>
  );
}
