import {
  type ActividadGrupalOrganizer,
  type AuthUser,
} from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadesGrupalesTrashTable } from "../components/actividades-grupales-trash-table";
import { ActividadesGrupalesToolbar } from "../components/actividades-grupales-toolbar";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import { canViewActividadesGrupalesTrash } from "../lib/actividades-grupales-permissions";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import {
  useActividadGrupalTenantOptionsQuery,
  useActividadesGrupalesTrashQuery,
} from "../model/actividades-grupales-queries";
import { useActividadGrupalTiposQuery } from "@/features/actividad-grupal-tipos/model/actividad-grupal-tipos-queries";

type ActividadesGrupalesTrashPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function ActividadesGrupalesTrashPage({
  navigate,
  user,
}: ActividadesGrupalesTrashPageProps) {
  const [search, setSearch] = useState("");
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState("");
  const [selectedOrganizer, setSelectedOrganizer] = useState<ActividadGrupalOrganizer | "">("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const showTenantFilter = user.role === "super_admin";
  const canViewTrash = canViewActividadesGrupalesTrash(user);
  const effectiveTenantId = showTenantFilter
    ? selectedTenantId === ""
      ? null
      : selectedTenantId
    : user.tenantId;
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(showTenantFilter && canViewTrash);
  const activityTypesQuery = useActividadGrupalTiposQuery(
    { tenantId: effectiveTenantId, includeInactive: true },
    canViewTrash && (!showTenantFilter || effectiveTenantId !== null),
  );
  const trashQuery = useActividadesGrupalesTrashQuery(
    {
      search,
      activityType: null,
      activityTypeId: selectedActivityTypeId === "" ? null : selectedActivityTypeId,
      organizer: selectedOrganizer === "" ? null : selectedOrganizer,
      activityMonth: null,
      tenantId: effectiveTenantId,
    },
    canViewTrash,
  );

  if (!canViewTrash) {
    return (
      <section className="actividades-empty" aria-labelledby="actividades-trash-denied-title">
        <p className="eyebrow">Log de eliminaciones</p>
        <h2 id="actividades-trash-denied-title">No tienes acceso al log</h2>
        <button
          className="outline-action actividades-trash-back-action"
          type="button"
          aria-label="Volver al listado"
          data-tooltip="Volver al listado"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="visually-hidden">Volver al listado</span>
        </button>
      </section>
    );
  }

  return (
    <section className="actividades-stack" aria-labelledby="actividades-trash-title">
      <h1 className="visually-hidden" id="actividades-trash-title">
        Log de eliminaciones
      </h1>

      <div className="actividades-form-nav">
        <button
          className="outline-action actividades-back-action actividades-trash-back-action"
          type="button"
          aria-label="Volver al listado"
          data-tooltip="Volver al listado"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span className="visually-hidden">Volver al listado</span>
        </button>
        <span className="actividades-form-nav__context">Log de eliminaciones</span>
      </div>

      <ActividadesGrupalesToolbar
        activityMonth=""
        search={search}
        selectedActivityTypeId={selectedActivityTypeId}
        selectedOrganizer={selectedOrganizer}
        selectedTenantId={selectedTenantId}
        showMonthFilter={false}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        activityTypeOptions={activityTypesQuery.data?.activityTypes ?? []}
        onActivityMonthChange={() => undefined}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        onActivityTypeIdChange={setSelectedActivityTypeId}
        onOrganizerChange={setSelectedOrganizer}
        onSearchChange={setSearch}
        onTenantChange={setSelectedTenantId}
      />

      {trashQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveActividadesGrupalesApiError(trashQuery.error)}
        </p>
      ) : null}

      <ActividadesGrupalesTrashTable
        actividadesGrupales={trashQuery.data?.actividadesGrupales ?? []}
        isLoading={trashQuery.isLoading}
        showTenantColumn={showTenantFilter}
      />
    </section>
  );
}
