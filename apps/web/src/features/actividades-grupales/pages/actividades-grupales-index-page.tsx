import { type ActividadGrupalType, type AuthUser } from "@cuidarte/contracts";
import { CalendarPlus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadesGrupalesTable } from "../components/actividades-grupales-table";
import { ActividadesGrupalesToolbar } from "../components/actividades-grupales-toolbar";
import {
  buildActividadGrupalDiligenciamientoPath,
  CREACION_ACTIVIDADES_NEW_PATH,
} from "../lib/actividades-grupales-paths";
import { canManageActividadesGrupales } from "../lib/actividades-grupales-permissions";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import { openActividadGrupalActaPdf } from "../lib/open-actividad-grupal-acta-pdf";
import {
  useActividadGrupalTenantOptionsQuery,
  useActividadesGrupalesQuery,
} from "../model/actividades-grupales-queries";

type ActividadesGrupalesIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function ActividadesGrupalesIndexPage({
  navigate,
  user,
}: ActividadesGrupalesIndexPageProps) {
  const [search, setSearch] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState<ActividadGrupalType | "">("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const showTenantFilter = user.role === "super_admin";
  const canManageActivities = canManageActividadesGrupales(user);
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(showTenantFilter);
  const actividadesQuery = useActividadesGrupalesQuery({
    search,
    activityType: selectedActivityType === "" ? null : selectedActivityType,
    tenantId: showTenantFilter
      ? selectedTenantId === ""
        ? null
        : selectedTenantId
      : user.tenantId,
  });

  return (
    <section className="actividades-stack" aria-labelledby="actividades-title">
      <h1 className="visually-hidden" id="actividades-title">
        Sesiones grupales
      </h1>

      <ActividadesGrupalesToolbar
        search={search}
        selectedActivityType={selectedActivityType}
        selectedTenantId={selectedTenantId}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        onActivityTypeChange={setSelectedActivityType}
        onSearchChange={setSearch}
        onTenantChange={setSelectedTenantId}
      />

      {actividadesQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveActividadesGrupalesApiError(actividadesQuery.error)}
        </p>
      ) : null}

      <ActividadesGrupalesTable
        actividadesGrupales={actividadesQuery.data?.actividadesGrupales ?? []}
        canManageActividadesGrupales={canManageActivities}
        isLoading={actividadesQuery.isLoading}
        onOpenDiligenciamiento={(actividad) =>
          navigate(buildActividadGrupalDiligenciamientoPath(actividad.id))
        }
        onOpenActaPdf={(actividad) => openActividadGrupalActaPdf(actividad.id)}
        showTenantColumn={showTenantFilter}
      />

      {canManageActivities ? (
        <button
          className="actividades-floating-action"
          type="button"
          aria-label="Crear actividad"
          title="Crear actividad"
          onClick={() => navigate(CREACION_ACTIVIDADES_NEW_PATH)}
        >
          <CalendarPlus aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
