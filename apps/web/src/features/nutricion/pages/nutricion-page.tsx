import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  getNutricionAdultoIdFromPath,
  getNutricionAttentionCreateAdultoIdFromPath,
  getNutricionHistoryAdultoIdFromPath,
  NUTRICION_PATH,
} from "../lib/nutricion-paths";
import { NutricionAdultoPage } from "./nutricion-adulto-page";
import { NutricionAttentionCreatePage } from "./nutricion-attention-create-page";
import { NutricionIndexPage } from "./nutricion-index-page";

type NutricionPageProps = {
  path: string;
  navigate: Navigate;
  user: AuthUser;
};

export function NutricionPage({ path, navigate, user }: NutricionPageProps) {
  if (path === NUTRICION_PATH) {
    return <NutricionIndexPage navigate={navigate} user={user} />;
  }

  const attentionAdultoMayorId = getNutricionAttentionCreateAdultoIdFromPath(path);
  if (attentionAdultoMayorId !== null) {
    return (
      <NutricionAttentionCreatePage adultoMayorId={attentionAdultoMayorId} navigate={navigate} />
    );
  }

  const historyAdultoMayorId = getNutricionHistoryAdultoIdFromPath(path);
  if (historyAdultoMayorId !== null) {
    return (
      <NutricionAdultoPage
        adultoMayorId={historyAdultoMayorId}
        navigate={navigate}
        user={user}
        view="history"
      />
    );
  }

  const adultoMayorId = getNutricionAdultoIdFromPath(path);
  if (adultoMayorId !== null) {
    return <NutricionAdultoPage adultoMayorId={adultoMayorId} navigate={navigate} user={user} />;
  }

  return (
    <section className="nutricion-empty" aria-labelledby="nutricion-not-found-title">
      <p className="eyebrow">Nutrición</p>
      <h2 id="nutricion-not-found-title">Ruta no encontrada</h2>
      <button className="outline-action" type="button" onClick={() => navigate(NUTRICION_PATH)}>
        <ChevronLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </section>
  );
}
