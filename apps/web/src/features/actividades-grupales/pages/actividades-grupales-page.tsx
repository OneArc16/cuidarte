import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  CREACION_ACTIVIDADES_NEW_PATH,
  CREACION_ACTIVIDADES_PATH,
  getActividadGrupalEditIdFromPath,
  getActividadGrupalDiligenciamientoIdFromPath,
} from "../lib/actividades-grupales-paths";
import { ActividadGrupalCreatePage } from "./actividad-grupal-create-page";
import { ActividadGrupalDiligenciamientoPage } from "./actividad-grupal-diligenciamiento-page";
import { ActividadGrupalEditPage } from "./actividad-grupal-edit-page";
import { ActividadesGrupalesIndexPage } from "./actividades-grupales-index-page";

type ActividadesGrupalesPageProps = {
  navigate: Navigate;
  path: string;
  user: AuthUser;
};

export function ActividadesGrupalesPage({ navigate, path, user }: ActividadesGrupalesPageProps) {
  if (path === CREACION_ACTIVIDADES_PATH) {
    return <ActividadesGrupalesIndexPage navigate={navigate} user={user} />;
  }

  if (path === CREACION_ACTIVIDADES_NEW_PATH) {
    return <ActividadGrupalCreatePage navigate={navigate} user={user} />;
  }

  const editActivityId = getActividadGrupalEditIdFromPath(path);

  if (editActivityId !== null) {
    return <ActividadGrupalEditPage activityId={editActivityId} navigate={navigate} />;
  }

  const activityId = getActividadGrupalDiligenciamientoIdFromPath(path);

  if (activityId !== null) {
    return <ActividadGrupalDiligenciamientoPage activityId={activityId} navigate={navigate} />;
  }

  return (
    <section className="actividades-empty" aria-labelledby="actividades-not-found-title">
      <p className="eyebrow">Sesiones grupales</p>
      <h2 id="actividades-not-found-title">Ruta no encontrada</h2>
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
