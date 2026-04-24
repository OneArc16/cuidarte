import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  REGISTRO_ALIMENTACION_NEW_PATH,
  REGISTRO_ALIMENTACION_PATH,
  getAlimentacionCreateAdultoMayorIdFromPath,
  getAlimentacionEditIdFromPath,
} from "../lib/alimentacion-paths";
import { AlimentacionCreatePage } from "./alimentacion-create-page";
import { AlimentacionEditPage } from "./alimentacion-edit-page";
import { AlimentacionIndexPage } from "./alimentacion-index-page";

type AlimentacionPageProps = {
  navigate: Navigate;
  path: string;
  user: AuthUser;
};

export function AlimentacionPage({ navigate, path, user }: AlimentacionPageProps) {
  if (path === REGISTRO_ALIMENTACION_PATH) {
    return <AlimentacionIndexPage navigate={navigate} user={user} />;
  }

  if (path === REGISTRO_ALIMENTACION_NEW_PATH) {
    return <AlimentacionCreatePage adultoMayorId={null} navigate={navigate} user={user} />;
  }

  const adultoMayorId = getAlimentacionCreateAdultoMayorIdFromPath(path);

  if (adultoMayorId !== null) {
    return <AlimentacionCreatePage adultoMayorId={adultoMayorId} navigate={navigate} user={user} />;
  }

  const recordId = getAlimentacionEditIdFromPath(path);

  if (recordId !== null) {
    return <AlimentacionEditPage navigate={navigate} recordId={recordId} />;
  }

  return (
    <section className="alimentacion-empty" aria-labelledby="alimentacion-not-found-title">
      <p className="eyebrow">Registro de alimentación</p>
      <h2 id="alimentacion-not-found-title">Ruta no encontrada</h2>
      <button
        className="outline-action"
        type="button"
        onClick={() => navigate(REGISTRO_ALIMENTACION_PATH)}
      >
        <ChevronLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </section>
  );
}
