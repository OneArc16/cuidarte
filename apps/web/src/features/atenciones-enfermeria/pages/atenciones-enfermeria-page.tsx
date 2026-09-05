import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  ATENCIONES_ENFERMERIA_PATH,
  getAtencionEnfermeriaCreateAdultoIdFromPath,
  getAtencionEnfermeriaDetailIdFromPath,
  getAtencionesEnfermeriaHistoryAdultoIdFromPath,
} from "../lib/atenciones-enfermeria-paths";
import { AtencionesEnfermeriaCreatePage } from "./atenciones-enfermeria-create-page";
import { AtencionesEnfermeriaDetailPage } from "./atenciones-enfermeria-detail-page";
import { AtencionesEnfermeriaIndexPage } from "./atenciones-enfermeria-index-page";
import { AtencionesEnfermeriaHistoryPage } from "./atenciones-enfermeria-history-page";

type AtencionesEnfermeriaPageProps = {
  navigate: Navigate;
  path: string;
  user: AuthUser;
};

export function AtencionesEnfermeriaPage({ navigate, path, user }: AtencionesEnfermeriaPageProps) {
  if (path === ATENCIONES_ENFERMERIA_PATH) {
    return <AtencionesEnfermeriaIndexPage navigate={navigate} user={user} />;
  }

  const adultoMayorId = getAtencionEnfermeriaCreateAdultoIdFromPath(path);

  if (adultoMayorId !== null) {
    return <AtencionesEnfermeriaCreatePage adultoMayorId={adultoMayorId} navigate={navigate} />;
  }

  const historyAdultoId = getAtencionesEnfermeriaHistoryAdultoIdFromPath(path);

  if (historyAdultoId !== null) {
    return (
      <AtencionesEnfermeriaHistoryPage
        adultoMayorId={historyAdultoId}
        navigate={navigate}
      />
    );
  }

  const atencionId = getAtencionEnfermeriaDetailIdFromPath(path);

  if (atencionId !== null) {
    return <AtencionesEnfermeriaDetailPage atencionId={atencionId} navigate={navigate} />;
  }

  return (
    <section
      className="atenciones-enfermeria-empty"
      aria-labelledby="atenciones-enfermeria-not-found-title"
    >
      <p className="eyebrow">Enfermería</p>
      <h2 id="atenciones-enfermeria-not-found-title">Ruta no encontrada</h2>
      <button
        className="outline-action"
        type="button"
        onClick={() => navigate(ATENCIONES_ENFERMERIA_PATH)}
      >
        <ChevronLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </section>
  );
}
