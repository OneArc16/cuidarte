import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { AtencionIndividualCreatePage } from "@/features/atenciones-individuales/pages/atencion-individual-create-page";
import { AtencionIndividualDetailPage } from "@/features/atenciones-individuales/pages/atencion-individual-detail-page";
import { AtencionIndividualHistoryPage } from "@/features/atenciones-individuales/pages/atencion-individual-history-page";

import {
  ADULTOS_MAYORES_NEW_PATH,
  ADULTOS_MAYORES_PATH,
  getAdultoMayorEditIdFromPath,
} from "../lib/adultos-mayores-paths";
import {
  getAtencionIndividualCreateAdultoIdFromPath,
  getAtencionIndividualDetailIdsFromPath,
  getHistoriaClinicaAdultoIdFromPath,
} from "@/features/atenciones-individuales/lib/atenciones-individuales-paths";
import { AdultoMayorCreatePage } from "./adulto-mayor-create-page";
import { AdultoMayorEditPage } from "./adulto-mayor-edit-page";
import { AdultosMayoresIndexPage } from "./adultos-mayores-index-page";

type AdultosMayoresPageProps = {
  navigate: Navigate;
  path: string;
  user: AuthUser;
};

export function AdultosMayoresPage({ navigate, path, user }: AdultosMayoresPageProps) {
  if (path === ADULTOS_MAYORES_PATH) {
    return <AdultosMayoresIndexPage navigate={navigate} user={user} />;
  }

  if (path === ADULTOS_MAYORES_NEW_PATH) {
    return <AdultoMayorCreatePage navigate={navigate} user={user} />;
  }

  const atencionCreateAdultoMayorId = getAtencionIndividualCreateAdultoIdFromPath(path);

  if (atencionCreateAdultoMayorId !== null) {
    return (
      <AtencionIndividualCreatePage
        adultoMayorId={atencionCreateAdultoMayorId}
        navigate={navigate}
      />
    );
  }

  const historiaClinicaAdultoMayorId = getHistoriaClinicaAdultoIdFromPath(path);

  if (historiaClinicaAdultoMayorId !== null) {
    return (
      <AtencionIndividualHistoryPage
        adultoMayorId={historiaClinicaAdultoMayorId}
        navigate={navigate}
        user={user}
      />
    );
  }

  const atencionDetailIds = getAtencionIndividualDetailIdsFromPath(path);

  if (atencionDetailIds !== null) {
    return (
      <AtencionIndividualDetailPage
        atencionId={atencionDetailIds.atencionId}
        navigate={navigate}
        user={user}
      />
    );
  }

  const adultoMayorId = getAdultoMayorEditIdFromPath(path);

  if (adultoMayorId !== null) {
    return <AdultoMayorEditPage adultoMayorId={adultoMayorId} navigate={navigate} />;
  }

  return (
    <section className="adultos-empty" aria-labelledby="adultos-not-found-title">
      <p className="eyebrow">Adultos mayores</p>
      <h2 id="adultos-not-found-title">Ruta no encontrada</h2>
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
