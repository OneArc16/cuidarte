import { type ActividadGrupalOrganizer, type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadesGrupalesChangeLogTable } from "../components/actividades-grupales-change-log-table";
import { ActividadesGrupalesToolbar } from "../components/actividades-grupales-toolbar";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import { canViewActividadesGrupalesTrash } from "../lib/actividades-grupales-permissions";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import {
  useActividadGrupalTenantOptionsQuery,
  useActividadGrupalChangeLogQuery,
} from "../model/actividades-grupales-queries";
import { useActividadGrupalTiposQuery } from "@/features/actividad-grupal-tipos/model/actividad-grupal-tipos-queries";

type ActividadesGrupalesTrashPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

const CHANGE_LOG_PAGE_SIZE = 20;

export function ActividadesGrupalesTrashPage({
  navigate,
  user,
}: ActividadesGrupalesTrashPageProps) {
  const [search, setSearch] = useState("");
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState("");
  const [selectedOrganizer, setSelectedOrganizer] = useState<ActividadGrupalOrganizer | "">("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [pageCursors, setPageCursors] = useState<Array<string | null>>([null]);
  const [currentPage, setCurrentPage] = useState(0);
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
  const changeLogQuery = useActividadGrupalChangeLogQuery(
    {
      search,
      activityType: null,
      activityTypeId: selectedActivityTypeId === "" ? null : selectedActivityTypeId,
      organizer: selectedOrganizer === "" ? null : selectedOrganizer,
      activityMonth: null,
      tenantId: effectiveTenantId,
      cursor: pageCursors[currentPage] ?? null,
      limit: CHANGE_LOG_PAGE_SIZE,
    },
    canViewTrash,
  );

  function resetPagination() {
    setPageCursors([null]);
    setCurrentPage(0);
  }

  function goToNextPage() {
    const nextCursor = changeLogQuery.data?.nextCursor;

    if (nextCursor === null || nextCursor === undefined) {
      return;
    }

    setPageCursors((cursors) => [...cursors.slice(0, currentPage + 1), nextCursor]);
    setCurrentPage((page) => page + 1);
  }

  if (!canViewTrash) {
    return (
      <section className="actividades-empty" aria-labelledby="actividades-trash-denied-title">
        <p className="eyebrow">Historial de cambios</p>
        <h2 id="actividades-trash-denied-title">No tienes acceso al historial</h2>
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
        Historial de cambios
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
        <span className="actividades-form-nav__context">Historial de cambios</span>
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
        onActivityTypeIdChange={(value) => {
          setSelectedActivityTypeId(value);
          resetPagination();
        }}
        onOrganizerChange={(value) => {
          setSelectedOrganizer(value);
          resetPagination();
        }}
        onSearchChange={(value) => {
          setSearch(value);
          resetPagination();
        }}
        onTenantChange={(value) => {
          setSelectedTenantId(value);
          resetPagination();
        }}
      />

      {changeLogQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveActividadesGrupalesApiError(changeLogQuery.error)}
        </p>
      ) : null}

      <ActividadesGrupalesChangeLogTable
        entries={changeLogQuery.data?.entries ?? []}
        isLoading={changeLogQuery.isLoading}
        showTenantColumn={showTenantFilter}
      />

      {changeLogQuery.data !== undefined &&
      (changeLogQuery.data.entries.length > 0 || currentPage > 0) ? (
        <nav className="actividades-change-log-pagination" aria-label="Paginación del historial">
          <button
            className="outline-action actividades-change-log-pagination__button"
            type="button"
            aria-label="Página anterior"
            data-tooltip="Página anterior"
            disabled={currentPage === 0 || changeLogQuery.isFetching}
            onClick={() => setCurrentPage((page) => Math.max(0, page - 1))}
          >
            <ChevronLeft aria-hidden="true" />
          </button>
          <span className="actividades-change-log-pagination__page" aria-live="polite">
            <span className="visually-hidden">Página </span>
            {currentPage + 1}
          </span>
          <button
            className="outline-action actividades-change-log-pagination__button"
            type="button"
            aria-label="Página siguiente"
            data-tooltip="Página siguiente"
            disabled={changeLogQuery.data.nextCursor === null || changeLogQuery.isFetching}
            onClick={goToNextPage}
          >
            <ChevronRight aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </section>
  );
}
