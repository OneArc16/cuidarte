import { type ActividadGrupalListItem, type AuthUser } from "@cuidarte/contracts";
import { CalendarPlus, ListRestart, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { ReportExportButton } from "@/features/reports/components/report-export-button";
import { ReportHistoryButton } from "@/features/reports/components/report-history-button";
import { getCurrentMonthInputValue } from "@/features/alimentacion/lib/alimentacion-formatters";

import { ActividadGrupalDeleteDialog } from "../components/actividad-grupal-delete-dialog";
import { ActividadesGrupalesTable } from "../components/actividades-grupales-table";
import { ActividadesGrupalesToolbar } from "../components/actividades-grupales-toolbar";
import {
  buildActividadGrupalEditPath,
  buildActividadGrupalDiligenciamientoPath,
  CREACION_ACTIVIDADES_TRASH_PATH,
  CREACION_ACTIVIDADES_NEW_PATH,
  CREACION_ACTIVIDADES_CORRECTIONS_PATH,
} from "../lib/actividades-grupales-paths";
import {
  canManageActividadesGrupales,
  canViewActividadesGrupalesTrash,
} from "../lib/actividades-grupales-permissions";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import { openActividadGrupalActaPdf } from "../lib/open-actividad-grupal-acta-pdf";
import {
  type ActividadesGrupalesFilterState,
  loadActividadesGrupalesFilters,
  saveActividadesGrupalesFilters,
} from "../lib/actividades-grupales-filter-state";
import {
  useDeleteActividadGrupalMutation,
  useActividadGrupalTenantOptionsQuery,
  useActividadesGrupalesQuery,
} from "../model/actividades-grupales-queries";
import { useActividadGrupalTiposQuery } from "@/features/actividad-grupal-tipos/model/actividad-grupal-tipos-queries";

type ActividadesGrupalesIndexPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function ActividadesGrupalesIndexPage({
  navigate,
  user,
}: ActividadesGrupalesIndexPageProps) {
  const defaultFilters: ActividadesGrupalesFilterState = {
    search: "",
    activityMonth: getCurrentMonthInputValue(),
    activityType: "",
    activityTypeId: "",
    organizer: "",
    tenantId: "",
  };
  const [filters, setFilters] = useState(() =>
    loadActividadesGrupalesFilters(user.id, defaultFilters),
  );
  const [activityPendingDelete, setActivityPendingDelete] =
    useState<ActividadGrupalListItem | null>(null);
  const {
    activityMonth,
    activityType,
    activityTypeId,
    organizer,
    search,
    tenantId: selectedTenantId,
  } = filters;
  const selectedActivityType = activityType;
  const selectedOrganizer = organizer;
  const showTenantFilter = user.role === "super_admin";
  const effectiveActivityMonth = activityMonth.trim() === "" ? null : activityMonth;
  const reportPeriod = effectiveActivityMonth ?? "ALL";
  const reportTenantId = showTenantFilter
    ? selectedTenantId === ""
      ? null
      : selectedTenantId
    : user.tenantId;
  const canViewTrash = canViewActividadesGrupalesTrash(user);
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(showTenantFilter);
  const activityTypesQuery = useActividadGrupalTiposQuery(
    { tenantId: reportTenantId, includeInactive: true },
    !showTenantFilter || reportTenantId !== null,
  );
  const deleteMutation = useDeleteActividadGrupalMutation();
  const updateFilter = <T extends keyof ActividadesGrupalesFilterState>(
    key: T,
    value: ActividadesGrupalesFilterState[T],
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
  };

  useEffect(() => {
    saveActividadesGrupalesFilters(user.id, filters);
  }, [filters, user.id]);

  const actividadesQuery = useActividadesGrupalesQuery({
    search,
    activityType: selectedActivityType === "" ? null : selectedActivityType,
    activityTypeId: activityTypeId === "" ? null : activityTypeId,
    organizer: selectedOrganizer === "" ? null : selectedOrganizer,
    activityMonth: effectiveActivityMonth,
    tenantId: reportTenantId,
  });

  return (
    <section className="actividades-stack" aria-labelledby="actividades-title">
      <h1 className="visually-hidden" id="actividades-title">
        Sesiones grupales
      </h1>

      <div className="actividades-form-nav">
        {user.role === "super_admin" ? (
          <button
            className="outline-action actividades-correction-nav-action"
            type="button"
            aria-label="Normalizar consecutivos"
            data-tooltip="Normalizar consecutivos"
            onClick={() => navigate(CREACION_ACTIVIDADES_CORRECTIONS_PATH)}
          >
            <ListRestart aria-hidden="true" />
            <span className="visually-hidden">Normalizar consecutivos</span>
          </button>
        ) : null}
        {canViewTrash ? (
          <button
            className="outline-action actividades-back-action actividades-trash-action"
            type="button"
            aria-label="Ver papelera"
            data-tooltip="Ver papelera"
            onClick={() => navigate(CREACION_ACTIVIDADES_TRASH_PATH)}
          >
            <Trash2 aria-hidden="true" />
            <span className="visually-hidden">Ver papelera</span>
          </button>
        ) : null}
        <span className="actividades-form-nav__context">Listado activo</span>
      </div>

      <ActividadesGrupalesToolbar
        activityMonth={activityMonth}
        exportButton={
          <div className="module-report-actions">
            <ReportExportButton className="actividades-zip-action" period={reportPeriod} tenantId={reportTenantId} type="ACTAS_SESIONES_GRUPALES" />
            <ReportHistoryButton period={reportPeriod} tenantId={reportTenantId} type="ACTAS_SESIONES_GRUPALES" />
          </div>
        }
        search={search}
        selectedActivityTypeId={activityTypeId}
        selectedOrganizer={selectedOrganizer}
        selectedTenantId={selectedTenantId}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        activityTypeOptions={activityTypesQuery.data?.activityTypes ?? []}
        onActivityMonthChange={(value) => updateFilter("activityMonth", value)}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        onActivityTypeIdChange={(value) => updateFilter("activityTypeId", value)}
        onOrganizerChange={(value) => updateFilter("organizer", value)}
        onSearchChange={(value) => updateFilter("search", value)}
        onTenantChange={(value) => updateFilter("tenantId", value)}
      />

      {actividadesQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveActividadesGrupalesApiError(actividadesQuery.error)}
        </p>
      ) : null}

      <ActividadesGrupalesTable
        actividadesGrupales={actividadesQuery.data?.actividadesGrupales ?? []}
        isLoading={actividadesQuery.isLoading}
        onDelete={(actividad) => {
          deleteMutation.reset();
          setActivityPendingDelete(actividad);
        }}
        onEdit={(actividad) => navigate(buildActividadGrupalEditPath(actividad.id))}
        onOpenDiligenciamiento={(actividad) =>
          navigate(buildActividadGrupalDiligenciamientoPath(actividad.id))
        }
        onOpenActaPdf={(actividad) => openActividadGrupalActaPdf(actividad.id)}
        showTenantColumn={showTenantFilter}
      />

      {activityPendingDelete !== null ? (
        <ActividadGrupalDeleteDialog
          actividad={activityPendingDelete}
          errorMessage={resolveActividadesGrupalesApiError(deleteMutation.error)}
          isPending={deleteMutation.isPending}
          onClose={() => {
            if (!deleteMutation.isPending) {
              deleteMutation.reset();
              setActivityPendingDelete(null);
            }
          }}
          onConfirm={(reason) => {
            deleteMutation.mutate(
              { activityId: activityPendingDelete.id, reason },
              {
                onSuccess: () => {
                  deleteMutation.reset();
                  setActivityPendingDelete(null);
                  toast.success("Acta enviada a la papelera.");
                },
              },
            );
          }}
        />
      ) : null}

      {canManageActividadesGrupales(user) ? (
        <button
          className="actividades-floating-action"
          type="button"
          aria-label="Crear actividad"
          data-tooltip="Crear actividad"
          onClick={() => navigate(CREACION_ACTIVIDADES_NEW_PATH)}
        >
          <CalendarPlus aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
