import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  BACKOFFICE_NEW_TENANT_PATH,
  BACKOFFICE_PATH,
  getTenantIdFromPath,
  isBackofficePath,
} from "../lib/backoffice-paths";
import { BackofficeTenantCreatePage } from "./tenant-create-page";
import { BackofficeTenantDetailPage } from "./tenant-detail-page";
import { BackofficeTenantIndexPage } from "./tenant-index-page";

type BackofficePageProps = {
  path: string;
  navigate: Navigate;
};

export { BACKOFFICE_NEW_TENANT_PATH, BACKOFFICE_PATH, isBackofficePath };

export function BackofficePage({ path, navigate }: BackofficePageProps) {
  if (path === BACKOFFICE_PATH) {
    return <BackofficeTenantIndexPage navigate={navigate} />;
  }

  if (path === BACKOFFICE_NEW_TENANT_PATH) {
    return <BackofficeTenantCreatePage navigate={navigate} />;
  }

  const tenantId = getTenantIdFromPath(path);

  if (tenantId !== null) {
    return <BackofficeTenantDetailPage navigate={navigate} tenantId={tenantId} />;
  }

  return (
    <section className="backoffice-empty" aria-labelledby="backoffice-not-found-title">
      <p className="eyebrow">BackOffice</p>
      <h2 id="backoffice-not-found-title">Ruta no encontrada</h2>
      <button className="outline-action" type="button" onClick={() => navigate(BACKOFFICE_PATH)}>
        <ChevronLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </section>
  );
}
