import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { NutricionPlanEditor } from "../components/nutricion-plan-editor";
import { resolveNutricionApiError } from "../lib/nutricion-formatters";
import { buildNutricionHistoryPath, NUTRICION_PATH } from "../lib/nutricion-paths";
import { useNutricionAdultoProfileQuery } from "../model/nutricion-queries";

type NutricionAttentionCreatePageProps = {
  adultoMayorId: string;
  navigate: Navigate;
};

export function NutricionAttentionCreatePage({
  adultoMayorId,
  navigate,
}: NutricionAttentionCreatePageProps) {
  const profileQuery = useNutricionAdultoProfileQuery(adultoMayorId);

  if (profileQuery.isLoading) {
    return (
      <section className="nutricion-empty" aria-busy="true">
        <p>Cargando adulto mayor...</p>
      </section>
    );
  }

  if (profileQuery.isError || profileQuery.data === undefined) {
    return (
      <section className="nutricion-empty">
        <p className="form-error" role="alert">
          {resolveNutricionApiError(profileQuery.error)}
        </p>
        <button className="outline-action" type="button" onClick={() => navigate(NUTRICION_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver a nutrición</span>
        </button>
      </section>
    );
  }

  const { adultoMayor } = profileQuery.data;

  return (
    <section
      className="nutricion-stack nutricion-attention-stack"
      aria-labelledby="nutricion-title"
    >
      <h1 className="visually-hidden" id="nutricion-title">
        Nueva atención nutricional
      </h1>

      <div className="nutricion-attention-nav">
        <button className="outline-action" type="button" onClick={() => navigate(NUTRICION_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="nutricion-attention-nav__context">Nueva atención nutricional</span>
      </div>

      <NutricionPlanEditor
        adultoMayorId={adultoMayorId}
        adultoMayor={adultoMayor}
        context="attention"
        onCancel={() => navigate(NUTRICION_PATH)}
        onSaved={() => navigate(buildNutricionHistoryPath(adultoMayorId), { replace: true })}
      />
    </section>
  );
}
