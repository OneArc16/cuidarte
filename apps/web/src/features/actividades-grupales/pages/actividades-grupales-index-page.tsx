import {
  type ActividadGrupalListItem,
  type ActividadGrupalOrganizer,
  type ActividadGrupalType,
  type AuthUser,
} from "@cuidarte/contracts";
import { CalendarPlus, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";
import { ReportExportButton } from "@/features/reports/components/report-export-button";

import { ActividadGrupalDeleteDialog } from "../components/actividad-grupal-delete-dialog";
import { ActividadesGrupalesTable } from "../components/actividades-grupales-table";
import { ActividadesGrupalesToolbar } from "../components/actividades-grupales-toolbar";
import {
  buildActividadGrupalEditPath,
  buildActividadGrupalDiligenciamientoPath,
  CREACION_ACTIVIDADES_TRASH_PATH,
  CREACION_ACTIVIDADES_NEW_PATH,
} from "../lib/actividades-grupales-paths";
import {
  canManageActividadesGrupales,
  canViewActividadesGrupalesTrash,
} from "../lib/actividades-grupales-permissions";
import { getCurrentMonthInputValue } from "@/features/alimentacion/lib/alimentacion-formatters";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import { openActividadGrupalActaPdf } from "../lib/open-actividad-grupal-acta-pdf";
import {
  useDeleteActividadGrupalMutation,
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
  const [activityMonth, setActivityMonth] = useState(getCurrentMonthInputValue());
  const [activityPendingDelete, setActivityPendingDelete] =
    useState<ActividadGrupalListItem | null>(null);
  const [selectedActivityType, setSelectedActivityType] = useState<ActividadGrupalType | "">("");
  const [selectedOrganizer, setSelectedOrganizer] = useState<ActividadGrupalOrganizer | "">("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
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
  const deleteMutation = useDeleteActividadGrupalMutation();
  const actividadesQuery = useActividadesGrupalesQuery({
    search,
    activityType: selectedActivityType === "" ? null : selectedActivityType,
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
        {canViewTrash ? (
          <button
            className="outline-action actividades-back-action actividades-trash-action"
            type="button"
            aria-label="Ver papelera"
            title="Ver papelera"
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
          <ReportExportButton
            className="actividades-zip-action"
            period={reportPeriod}
            tenantId={reportTenantId}
            type="ACTAS_SESIONES_GRUPALES"
          />
        }
        search={search}
        selectedActivityType={selectedActivityType}
        selectedOrganizer={selectedOrganizer}
        selectedTenantId={selectedTenantId}
        showTenantFilter={showTenantFilter}
        tenantOptions={tenantOptionsQuery.data?.tenants ?? []}
        onActivityMonthChange={setActivityMonth}
        isTenantOptionsLoading={tenantOptionsQuery.isLoading}
        onActivityTypeChange={setSelectedActivityType}
        onOrganizerChange={setSelectedOrganizer}
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
          onConfirm={() => {
            deleteMutation.mutate(activityPendingDelete.id, {
              onSuccess: () => {
                deleteMutation.reset();
                setActivityPendingDelete(null);
                toast.success("Acta enviada a la papelera.");
              },
            });
          }}
        />
      ) : null}

      {canManageActividadesGrupales(user) ? (
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
