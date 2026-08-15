import { type ActividadGrupalTrashListItem, type ActividadGrupalType, type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { ActividadGrupalRestoreDialog } from "../components/actividad-grupal-restore-dialog";
import { ActividadesGrupalesTrashTable } from "../components/actividades-grupales-trash-table";
import { ActividadesGrupalesToolbar } from "../components/actividades-grupales-toolbar";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import { canViewActividadesGrupalesTrash } from "../lib/actividades-grupales-permissions";
import { resolveActividadesGrupalesApiError } from "../lib/actividades-grupales-formatters";
import {
  useActividadGrupalTenantOptionsQuery,
  useActividadesGrupalesTrashQuery,
  useRestoreActividadGrupalMutation,
} from "../model/actividades-grupales-queries";

type ActividadesGrupalesTrashPageProps = {
  navigate: Navigate;
  user: AuthUser;
};

export function ActividadesGrupalesTrashPage({
  navigate,
  user,
}: ActividadesGrupalesTrashPageProps) {
  const [search, setSearch] = useState("");
  const [selectedActivityType, setSelectedActivityType] = useState<ActividadGrupalType | "">("");
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [activityPendingRestore, setActivityPendingRestore] = useState<ActividadGrupalTrashListItem | null>(
    null,
  );
  const showTenantFilter = user.role === "super_admin";
  const canViewTrash = canViewActividadesGrupalesTrash(user);
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(showTenantFilter && canViewTrash);
  const trashQuery = useActividadesGrupalesTrashQuery({
    search,
    activityType: selectedActivityType === "" ? null : selectedActivityType,
    tenantId: showTenantFilter
      ? selectedTenantId === ""
        ? null
        : selectedTenantId
      : user.tenantId,
  }, canViewTrash);
  const restoreMutation = useRestoreActividadGrupalMutation();

  if (!canViewTrash) {
    return (
      <section className="actividades-empty" aria-labelledby="actividades-trash-denied-title">
        <p className="eyebrow">Papelera de actas</p>
        <h2 id="actividades-trash-denied-title">No tienes acceso a la papelera</h2>
        <button
          className="outline-action"
          type="button"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver al listado</span>
        </button>
      </section>
    );
  }

  return (
    <section className="actividades-stack" aria-labelledby="actividades-trash-title">
      <h1 className="visually-hidden" id="actividades-trash-title">
        Papelera de actas
      </h1>

      <div className="actividades-form-nav">
        <button
          className="outline-action actividades-back-action"
          type="button"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver al listado</span>
        </button>
        <span className="actividades-form-nav__context">Papelera de actas</span>
      </div>

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

      {trashQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveActividadesGrupalesApiError(trashQuery.error)}
        </p>
      ) : null}

      <ActividadesGrupalesTrashTable
        actividadesGrupales={trashQuery.data?.actividadesGrupales ?? []}
        isLoading={trashQuery.isLoading}
        onRestore={(actividad) => {
          restoreMutation.reset();
          setActivityPendingRestore(actividad);
        }}
        showTenantColumn={showTenantFilter}
      />

      {activityPendingRestore !== null ? (
        <ActividadGrupalRestoreDialog
          actividad={activityPendingRestore}
          errorMessage={resolveActividadesGrupalesApiError(restoreMutation.error)}
          isPending={restoreMutation.isPending}
          onClose={() => {
            if (!restoreMutation.isPending) {
              restoreMutation.reset();
              setActivityPendingRestore(null);
            }
          }}
          onConfirm={() => {
            restoreMutation.mutate(
              { activityId: activityPendingRestore.id },
              {
                onSuccess: () => {
                  restoreMutation.reset();
                  setActivityPendingRestore(null);
                  toast.success("Acta restaurada.");
                },
              },
            );
          }}
        />
      ) : null}
    </section>
  );
}
