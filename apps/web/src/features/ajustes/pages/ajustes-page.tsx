import {
  type ActividadGrupalTipo,
  type ActividadGrupalTipoCreatorOption,
  type AuthUser,
} from "@cuidarte/contracts";
import {
  AlertTriangle,
  Check,
  Info,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Save,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useActividadGrupalTenantOptionsQuery } from "@/features/actividades-grupales/model/actividades-grupales-queries";
import { resolveActividadesGrupalesApiError } from "@/features/actividades-grupales/lib/actividades-grupales-formatters";
import { canManageEmpleadoPermissions } from "@/features/empleados/lib/empleados-permissions";
import { AjustesPermissionsDialog } from "../components/ajustes-permissions-dialog";
import {
  useUpdateActividadGrupalTipoGlobalConsecutiveConfigMutation,
  useActividadGrupalTipoCreatorOptionsQuery,
  useActividadGrupalTiposQuery,
  useCreateActividadGrupalTipoMutation,
  useUpdateActividadGrupalTipoMutation,
  useUpdateActividadGrupalTipoConsecutiveConfigMutation,
  useUpdateActividadGrupalTipoStatusMutation,
} from "@/features/actividad-grupal-tipos/model/actividad-grupal-tipos-queries";

type AjustesPageProps = {
  user: AuthUser;
};

type ActivityCatalogRow = {
  id: string;
  name: string;
  updatedAt: string;
  activityTypes: ActividadGrupalTipo[];
  activeCount: number;
  totalCount: number;
  isUnified: boolean;
};

const ALL_TENANTS_VALUE = "__all__";

export function AjustesPage({ user }: AjustesPageProps) {
  const shouldSelectTenant = user.role === "super_admin";
  const [selectedTenantId, setSelectedTenantId] = useState("");
  const [newActivityName, setNewActivityName] = useState("");
  const [editingActivityTypeId, setEditingActivityTypeId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [activityPendingDeactivation, setActivityPendingDeactivation] =
    useState<ActivityCatalogRow | null>(null);
  const [activityTypePendingConsecutiveConfig, setActivityTypePendingConsecutiveConfig] =
    useState<ActividadGrupalTipo | null>(null);
  const [globalSeriesActivity, setGlobalSeriesActivity] = useState<ActivityCatalogRow | null>(null);
  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const isAllTenantsSelected = shouldSelectTenant && selectedTenantId === ALL_TENANTS_VALUE;
  const effectiveTenantId = shouldSelectTenant
    ? selectedTenantId && !isAllTenantsSelected
      ? selectedTenantId
      : null
    : user.tenantId;
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(shouldSelectTenant);
  const activityTypesQuery = useActividadGrupalTiposQuery(
    { tenantId: effectiveTenantId, includeInactive: true },
    effectiveTenantId !== null || isAllTenantsSelected,
  );
  const createMutation = useCreateActividadGrupalTipoMutation();
  const updateMutation = useUpdateActividadGrupalTipoMutation();
  const statusMutation = useUpdateActividadGrupalTipoStatusMutation();
  const consecutiveConfigMutation = useUpdateActividadGrupalTipoConsecutiveConfigMutation();
  const globalConsecutiveConfigMutation =
    useUpdateActividadGrupalTipoGlobalConsecutiveConfigMutation();
  const activityTypes = activityTypesQuery.data?.activityTypes ?? [];

  const activityRows = useMemo(
    () => buildActivityCatalogRows(activityTypes, isAllTenantsSelected),
    [activityTypes, isAllTenantsSelected],
  );
  const errorMessage = useMemo(
    () =>
      resolveActividadesGrupalesApiError(activityTypesQuery.error) ??
      resolveActividadesGrupalesApiError(createMutation.error) ??
      resolveActividadesGrupalesApiError(updateMutation.error) ??
      resolveActividadesGrupalesApiError(statusMutation.error) ??
      resolveActividadesGrupalesApiError(consecutiveConfigMutation.error) ??
      resolveActividadesGrupalesApiError(tenantOptionsQuery.error) ??
      resolveActividadesGrupalesApiError(globalConsecutiveConfigMutation.error),
    [
      activityTypesQuery.error,
      createMutation.error,
      statusMutation.error,
      consecutiveConfigMutation.error,
      tenantOptionsQuery.error,
      updateMutation.error,
      globalConsecutiveConfigMutation.error,
    ],
  );

  function resetEditing() {
    setEditingActivityTypeId(null);
    setEditingName("");
  }

  useEffect(() => {
    if (activityPendingDeactivation === null) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActivityPendingDeactivation(null);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activityPendingDeactivation]);

  async function updateActivityRowStatus(row: ActivityCatalogRow, isActive: boolean) {
    const targetActivityTypes = row.activityTypes.filter(
      (activityType) => activityType.isActive !== isActive,
    );

    if (targetActivityTypes.length === 0) {
      setActivityPendingDeactivation(null);
      return;
    }

    const results = await Promise.allSettled(
      targetActivityTypes.map((activityType) =>
        statusMutation.mutateAsync({
          id: activityType.id,
          payload: { isActive },
        }),
      ),
    );
    const updatedCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = targetActivityTypes.length - updatedCount;

    setActivityPendingDeactivation(null);

    if (failedCount === 0) {
      toast.success(isActive ? "Actividad activada." : "Actividad desactivada.");
      return;
    }

    toast.warning(
      `${updatedCount} actividades actualizadas. ${failedCount} no pudieron actualizarse.`,
    );
  }

  async function updateActivityRowName(row: ActivityCatalogRow) {
    const name = editingName.trim();

    if (name === "") return;

    const results = await Promise.allSettled(
      row.activityTypes.map((activityType) =>
        updateMutation.mutateAsync({
          id: activityType.id,
          payload: { name },
        }),
      ),
    );
    const updatedCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = row.activityTypes.length - updatedCount;

    resetEditing();

    if (failedCount === 0) {
      toast.success(
        row.isUnified ? "Actividad actualizada en todos los centros." : "Actividad actualizada.",
      );
      return;
    }

    toast.warning(
      `${updatedCount} actividades actualizadas. ${failedCount} no pudieron actualizarse.`,
    );
  }

  return (
    <section className="actividades-stack ajustes-page" aria-label="Ajustes">
      <div className="home-dashboard-section__header ajustes-page__header">
        <span className="eyebrow">Ajustes</span>
        {canManageEmpleadoPermissions(user) ? (
          <button
            className="ajustes-page__icon-button"
            type="button"
            aria-label="Administrar permisos por persona"
            data-tooltip="Permisos por persona"
            onClick={() => setPermissionsDialogOpen(true)}
          >
            <ShieldCheck aria-hidden="true" />
          </button>
        ) : null}
      </div>

      <section className="actividad-form-panel">
        <div className="actividad-form-grid">
          {shouldSelectTenant ? (
            <label className="actividades-filter">
              <span>Centro</span>
              <select
                value={selectedTenantId}
                disabled={tenantOptionsQuery.isLoading}
                onChange={(event) => {
                  setSelectedTenantId(event.target.value);
                  resetEditing();
                }}
              >
                <option value="">Seleccionar centro</option>
                <option value={ALL_TENANTS_VALUE}>Todos los centros</option>
                {tenantOptionsQuery.data?.tenants.map((tenant) => (
                  <option key={tenant.id} value={tenant.id}>
                    {tenant.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <form
            className="actividades-search"
            onSubmit={async (event) => {
              event.preventDefault();

              if (
                (!isAllTenantsSelected && effectiveTenantId === null) ||
                newActivityName.trim() === ""
              ) {
                return;
              }

              const name = newActivityName.trim();

              if (isAllTenantsSelected) {
                const tenants = tenantOptionsQuery.data?.tenants ?? [];
                const results = await Promise.allSettled(
                  tenants.map((tenant) =>
                    createMutation.mutateAsync({ tenantId: tenant.id, name }),
                  ),
                );
                const createdCount = results.filter(
                  (result) => result.status === "fulfilled",
                ).length;
                const failedCount = results.length - createdCount;

                if (createdCount > 0) setNewActivityName("");
                if (failedCount === 0) {
                  toast.success(`Actividad creada en ${createdCount} centros.`);
                } else {
                  toast.warning(
                    `Actividad creada en ${createdCount} centros. ${failedCount} ya la tenían o no pudieron actualizarse.`,
                  );
                }
                return;
              }

              createMutation.mutate(
                {
                  tenantId: shouldSelectTenant ? effectiveTenantId : null,
                  name,
                },
                {
                  onSuccess: () => {
                    setNewActivityName("");
                    toast.success("Actividad creada.");
                  },
                },
              );
            }}
          >
            <span>Nueva actividad</span>
            <div className="actividades-search__control ajustes-page__activity-control">
              <Plus aria-hidden="true" />
              <input
                className="ajustes-page__activity-input"
                value={newActivityName}
                placeholder="Nombre de la actividad"
                disabled={
                  (!isAllTenantsSelected && effectiveTenantId === null) ||
                  (isAllTenantsSelected && tenantOptionsQuery.isLoading) ||
                  createMutation.isPending
                }
                onChange={(event) => setNewActivityName(event.target.value)}
              />
              <button
                className="primary-action"
                type="submit"
                disabled={
                  (!isAllTenantsSelected && effectiveTenantId === null) ||
                  (isAllTenantsSelected &&
                    (tenantOptionsQuery.isLoading ||
                      tenantOptionsQuery.data?.tenants.length === 0)) ||
                  newActivityName.trim() === "" ||
                  createMutation.isPending
                }
              >
                <Save aria-hidden="true" />
                Guardar
              </button>
            </div>
          </form>
        </div>
      </section>

      {errorMessage !== null ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <div className="actividades-table-wrap" aria-busy={activityTypesQuery.isLoading}>
        <table className="actividades-table">
          <thead>
            <tr>
              <th scope="col">Actividad</th>
              <th scope="col">Consecutivo</th>
              <th scope="col">Estado</th>
              <th scope="col">Actualizada</th>
              <th scope="col">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!isAllTenantsSelected && effectiveTenantId === null ? (
              <tr>
                <td colSpan={5}>Selecciona un centro para cargar el catálogo.</td>
              </tr>
            ) : activityTypesQuery.isLoading ? (
              <tr>
                <td colSpan={5}>Cargando actividades...</td>
              </tr>
            ) : activityRows.length === 0 ? (
              <tr>
                <td colSpan={5}>No hay actividades configuradas.</td>
              </tr>
            ) : (
              activityRows.map((activityRow) => {
                const isEditing = editingActivityTypeId === activityRow.id;
                const isActive = activityRow.activeCount > 0;

                return (
                  <tr key={activityRow.id}>
                    <td>
                      {isEditing ? (
                        <input
                          value={editingName}
                          autoFocus
                          onChange={(event) => setEditingName(event.target.value)}
                        />
                      ) : (
                        <div className="ajustes-page__activity-cell">
                          <strong>{activityRow.name}</strong>
                          {activityRow.isUnified ? (
                            <span className="ajustes-page__activity-meta">
                              {activityRow.totalCount} centros
                            </span>
                          ) : null}
                        </div>
                      )}
                    </td>
                    <td>{formatActivityConsecutive(activityRow)}</td>
                    <td>{formatActivityRowStatus(activityRow)}</td>
                    <td>{formatTimestamp(activityRow.updatedAt)}</td>
                    <td>
                      <div className="actividades-row-actions">
                        {isEditing ? (
                          <button
                            className="actividades-row-action"
                            type="button"
                            data-tooltip="Guardar nombre"
                            disabled={updateMutation.isPending || editingName.trim() === ""}
                            onClick={() => void updateActivityRowName(activityRow)}
                          >
                            <Save aria-hidden="true" />
                          </button>
                        ) : (
                          <button
                            className="actividades-row-action actividades-row-action--editar"
                            type="button"
                            data-tooltip="Editar actividad"
                            aria-label={`Editar actividad ${activityRow.name}`}
                            onClick={() => {
                              if (isAllTenantsSelected) {
                                setGlobalSeriesActivity(activityRow);
                                return;
                              }

                              if (!activityRow.isUnified) {
                                setActivityTypePendingConsecutiveConfig(
                                  activityRow.activityTypes[0] ?? null,
                                );
                                return;
                              }

                              setEditingActivityTypeId(activityRow.id);
                              setEditingName(activityRow.name);
                            }}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        <button
                          className={`actividades-row-action ${
                            isActive
                              ? "actividades-row-action--desactivar"
                              : "actividades-row-action--activar"
                          }`}
                          type="button"
                          data-tooltip={isActive ? "Desactivar" : "Activar"}
                          aria-label={`${isActive ? "Desactivar" : "Activar"} actividad ${activityRow.name}`}
                          disabled={statusMutation.isPending}
                          onClick={() => {
                            if (isActive) {
                              setActivityPendingDeactivation(activityRow);
                              return;
                            }

                            void updateActivityRowStatus(activityRow, true);
                          }}
                        >
                          {isActive ? (
                            <PowerOff aria-hidden="true" />
                          ) : (
                            <Power aria-hidden="true" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {activityPendingDeactivation !== null ? (
        <div
          className="actividad-delete-dialog-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setActivityPendingDeactivation(null);
          }}
        >
          <section
            className="actividad-delete-dialog actividad-catalog-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="actividad-catalog-confirm-title"
            aria-describedby="actividad-catalog-confirm-description"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <header className="actividad-delete-dialog__header">
              <div>
                <p className="actividad-delete-dialog__eyebrow">Acción sensible</p>
                <h2 id="actividad-catalog-confirm-title">Desactivar actividad</h2>
              </div>
              <button
                className="actividades-row-action actividad-delete-dialog__close-button"
                type="button"
                aria-label="Cerrar confirmación"
                data-tooltip="Cerrar"
                disabled={statusMutation.isPending}
                onClick={() => setActivityPendingDeactivation(null)}
              >
                <X aria-hidden="true" />
              </button>
            </header>
            <div className="actividad-delete-dialog__hero">
              <span className="actividad-delete-dialog__icon" aria-hidden="true">
                <AlertTriangle />
              </span>
              <div>
                <strong>¿Desactivar esta actividad?</strong>
                <span>
                  {activityPendingDeactivation.name}
                  {activityPendingDeactivation.isUnified
                    ? ` · ${activityPendingDeactivation.activeCount} centros activos`
                    : ""}
                </span>
              </div>
            </div>
            <p
              className="actividad-delete-dialog__message"
              id="actividad-catalog-confirm-description"
            >
              La actividad dejará de aparecer en nuevas sesiones, pero sus datos históricos se
              conservarán.
            </p>
            <footer className="actividad-delete-dialog__actions">
              <button
                className="secondary-action actividad-delete-dialog__action-button"
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => setActivityPendingDeactivation(null)}
              >
                Cancelar
              </button>
              <button
                className="primary-action actividad-delete-dialog__action-button actividad-delete-dialog__action-button--danger"
                type="button"
                disabled={statusMutation.isPending}
                onClick={() => void updateActivityRowStatus(activityPendingDeactivation, false)}
              >
                {statusMutation.isPending ? "Desactivando…" : "Desactivar actividad"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {activityTypePendingConsecutiveConfig !== null ? (
        <ActivityConsecutiveConfigDialog
          key={activityTypePendingConsecutiveConfig.id}
          activityType={activityTypePendingConsecutiveConfig}
          pending={consecutiveConfigMutation.isPending}
          onClose={() => setActivityTypePendingConsecutiveConfig(null)}
          onSave={async (payload) => {
            await updateMutation.mutateAsync({
              id: activityTypePendingConsecutiveConfig.id,
              payload: { name: payload.name },
            });
            await consecutiveConfigMutation.mutateAsync({
              id: activityTypePendingConsecutiveConfig.id,
              payload: {
                enabled: payload.enabled,
                prefix: payload.prefix,
                nextValue: payload.nextValue,
                creatorUserIds: payload.creatorUserIds,
              },
            });
            toast.success("Actividad y consecutivo actualizados.");
            setActivityTypePendingConsecutiveConfig(null);
          }}
        />
      ) : null}

      {globalSeriesActivity !== null ? (
        <ActivityGlobalConsecutiveConfigDialog
          key={globalSeriesActivity.id}
          activityName={globalSeriesActivity.name}
          initialConfig={globalSeriesActivity.activityTypes[0]?.consecutiveConfig ?? null}
          tenantCount={globalSeriesActivity.totalCount}
          activityTypes={globalSeriesActivity.activityTypes}
          tenants={tenantOptionsQuery.data?.tenants ?? []}
          seriesPending={globalConsecutiveConfigMutation.isPending}
          peoplePending={consecutiveConfigMutation.isPending}
          onClose={() => setGlobalSeriesActivity(null)}
          onSaveSeries={async ({ enabled, prefix }) => {
            const response = await globalConsecutiveConfigMutation.mutateAsync({
              activityTypeIds: globalSeriesActivity.activityTypes.map(
                (activityType) => activityType.id,
              ),
              enabled,
              prefix: enabled ? prefix : undefined,
            });
            const updatedActivityTypesById = new Map(
              response.activityTypes.map((activityType) => [activityType.id, activityType]),
            );
            setGlobalSeriesActivity((current) =>
              current === null
                ? null
                : {
                    ...current,
                    activityTypes: current.activityTypes.map(
                      (activityType) =>
                        updatedActivityTypesById.get(activityType.id) ?? activityType,
                    ),
                  },
            );
            toast.success("Prefijo guardado para esta actividad en todos los centros.");
          }}
          onSavePeople={async ({ activityTypeId, creatorUserIds }) => {
            const activityType = globalSeriesActivity.activityTypes.find(
              (item) => item.id === activityTypeId,
            );

            if (activityType?.consecutiveConfig === null || activityType === undefined) return;

            const updatedActivityType = await consecutiveConfigMutation.mutateAsync({
              id: activityTypeId,
              payload: {
                enabled: true,
                prefix: activityType.consecutiveConfig.prefix,
                nextValue: activityType.consecutiveConfig.nextValue,
                creatorUserIds,
              },
            });
            setGlobalSeriesActivity((current) =>
              current === null
                ? null
                : {
                    ...current,
                    activityTypes: current.activityTypes.map((item) =>
                      item.id === updatedActivityType.id ? updatedActivityType : item,
                    ),
                  },
            );
            toast.success("Personas con permiso actualizadas para este centro.");
          }}
        />
      ) : null}
      {permissionsDialogOpen ? (
        <AjustesPermissionsDialog onClose={() => setPermissionsDialogOpen(false)} />
      ) : null}
    </section>
  );
}

function buildActivityCatalogRows(
  activityTypes: ActividadGrupalTipo[],
  shouldUnify: boolean,
): ActivityCatalogRow[] {
  if (!shouldUnify) {
    return activityTypes.map((activityType) => toActivityCatalogRow([activityType], false));
  }

  const activityTypesByName = new Map<string, ActividadGrupalTipo[]>();

  for (const activityType of activityTypes) {
    const activityTypesGroup = activityTypesByName.get(activityType.normalizedName) ?? [];

    activityTypesGroup.push(activityType);
    activityTypesByName.set(activityType.normalizedName, activityTypesGroup);
  }

  return Array.from(activityTypesByName.values())
    .map((activityTypesGroup) => toActivityCatalogRow(activityTypesGroup, true))
    .sort((first, second) => first.name.localeCompare(second.name, "es"));
}

function toActivityCatalogRow(
  activityTypes: ActividadGrupalTipo[],
  isUnified: boolean,
): ActivityCatalogRow {
  const [firstActivityType] = activityTypes;

  if (firstActivityType === undefined) {
    throw new Error("Activity catalog row requires at least one activity type.");
  }

  const updatedAt = activityTypes.reduce(
    (latestUpdatedAt, activityType) =>
      new Date(activityType.updatedAt) > new Date(latestUpdatedAt)
        ? activityType.updatedAt
        : latestUpdatedAt,
    firstActivityType.updatedAt,
  );

  return {
    id: isUnified ? `activity-name:${firstActivityType.normalizedName}` : firstActivityType.id,
    name: firstActivityType.name,
    updatedAt,
    activityTypes,
    activeCount: activityTypes.filter((activityType) => activityType.isActive).length,
    totalCount: activityTypes.length,
    isUnified,
  };
}

function formatActivityRowStatus(row: ActivityCatalogRow): string {
  if (row.activeCount === row.totalCount) return "Activa";
  if (row.activeCount === 0) return "Inactiva";

  return `Mixta (${row.activeCount}/${row.totalCount})`;
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function ActivityConsecutiveConfigDialog({
  activityType,
  centerName,
  mode = "activity",
  pending,
  onClose,
  onSave,
}: {
  activityType: ActividadGrupalTipo;
  centerName?: string;
  mode?: "activity" | "people";
  pending: boolean;
  onClose: () => void;
  onSave: (payload: {
    name: string;
    enabled: boolean;
    prefix: string | undefined;
    nextValue: number | undefined;
    creatorUserIds: string[];
  }) => void | Promise<void>;
}) {
  const isPeopleMode = mode === "people";
  const creatorOptionsQuery = useActividadGrupalTipoCreatorOptionsQuery(activityType.id);
  const [name, setName] = useState(activityType.name);
  const [specialSeriesEnabled, setSpecialSeriesEnabled] = useState(
    activityType.consecutiveConfig !== null,
  );
  const [prefix, setPrefix] = useState(activityType.consecutiveConfig?.prefix ?? "");
  const nextValue = activityType.consecutiveConfig?.nextValue ?? 1;
  const [creatorUserIds, setCreatorUserIds] = useState<string[]>(
    activityType.consecutiveConfig?.creatorUserIds ?? [],
  );
  const [personSearch, setPersonSearch] = useState("");
  const [peopleView, setPeopleView] = useState<"all" | "selected">("all");
  const creatorOptions = creatorOptionsQuery.data?.creators ?? [];
  const allCreatorsSelected =
    creatorOptions.length > 0 && creatorUserIds.length === creatorOptions.length;
  const visibleCreators = useMemo(() => {
    const normalizedSearch = personSearch.trim().toLocaleLowerCase("es");

    return creatorOptions.filter((creator) => {
      const matchesView = peopleView === "all" || creatorUserIds.includes(creator.id);
      const searchableText =
        `${creator.fullName} ${formatUserRole(creator.role)}`.toLocaleLowerCase("es");

      return matchesView && (normalizedSearch === "" || searchableText.includes(normalizedSearch));
    });
  }, [creatorOptions, creatorUserIds, peopleView, personSearch]);

  function toggleCreator(userId: string) {
    setCreatorUserIds((current) =>
      current.includes(userId) ? current.filter((item) => item !== userId) : [...current, userId],
    );
  }

  return (
    <div
      className="actividad-delete-dialog-backdrop ajustes-consecutive-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !pending) onClose();
      }}
    >
      <section
        className="ajustes-consecutive-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="actividad-consecutive-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ajustes-consecutive-dialog__header">
          <div>
            <span className="ajustes-consecutive-dialog__badge">
              {isPeopleMode ? "Permisos por centro" : "Editar actividad"}
            </span>
            <h2 id="actividad-consecutive-title">{activityType.name}</h2>
            {isPeopleMode ? (
              <p className="ajustes-consecutive-dialog__mode-description">
                Define quién puede crear actas de esta actividad en {centerName ?? "este centro"}.
                El prefijo se administra para todos los centros.
              </p>
            ) : null}
          </div>
          <button
            className="ajustes-consecutive-dialog__close"
            type="button"
            aria-label="Cerrar"
            disabled={pending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="ajustes-consecutive-dialog__body">
          {!isPeopleMode ? (
            <label className="ajustes-consecutive-dialog__name-field">
              <span>Nombre de la actividad</span>
              <input value={name} maxLength={120} onChange={(event) => setName(event.target.value)} />
            </label>
          ) : null}

          {!isPeopleMode ? (
            <section
              className={
              specialSeriesEnabled
                ? "ajustes-consecutive-dialog__series-card"
                : "ajustes-consecutive-dialog__series-card is-collapsed"
            }
            aria-labelledby="actividad-series-title"
          >
            <div className="ajustes-consecutive-dialog__series-header">
              <div>
                <h3 id="actividad-series-title">Serie especial</h3>
                <p>
                  {specialSeriesEnabled
                    ? "Las actas de esta actividad usan su propio prefijo."
                    : "Las actas usan la serie general."}
                </p>
              </div>
              <button
                className="ajustes-consecutive-dialog__switch"
                type="button"
                role="switch"
                aria-checked={specialSeriesEnabled}
                aria-label="Usar serie especial"
                onClick={() => setSpecialSeriesEnabled((current) => !current)}
              >
                <span aria-hidden="true" />
              </button>
            </div>

            {specialSeriesEnabled ? (
              <>
                <div className="ajustes-consecutive-dialog__series-divider" />

                <div className="ajustes-consecutive-dialog__fields">
                  <label>
                    <span>Prefijo</span>
                    <input
                      value={prefix}
                      disabled={!specialSeriesEnabled}
                      maxLength={24}
                      placeholder="Ej. CAMPO"
                      onChange={(event) => setPrefix(event.target.value.toUpperCase())}
                    />
                  </label>
                  <div className="ajustes-consecutive-dialog__readonly-field">
                    <span>Próximo consecutivo</span>
                    <div className="ajustes-consecutive-dialog__stepper">
                      <button type="button" disabled aria-label="Disminuir consecutivo">
                        −
                      </button>
                      <strong>{specialSeriesEnabled ? nextValue : "—"}</strong>
                      <button type="button" disabled aria-label="Aumentar consecutivo">
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="ajustes-consecutive-dialog__series-footer">
                  <p>
                    Próxima acta:{" "}
                    <code>
                      {specialSeriesEnabled
                        ? (prefix.trim() === "" ? "PREFIJO" : prefix.trim()) +
                          "-" +
                          String(nextValue).padStart(3, "0")
                        : "Serie general"}
                    </code>
                  </p>
                  <span>
                    <Info aria-hidden="true" /> No modifica actas existentes
                  </span>
                </div>
              </>
            ) : null}
            </section>
          ) : null}

          <section
            className="ajustes-consecutive-dialog__people-section"
            aria-labelledby="actividad-people-title"
          >
            <div className="ajustes-consecutive-dialog__people-controls">
              <div className="ajustes-consecutive-dialog__people-header">
                <div>
                  <h3 id="actividad-people-title">
                    Personas con permiso{" "}
                    <span>
                      · {creatorUserIds.length} de {creatorOptions.length}
                    </span>
                  </h3>
                </div>
                <button
                  type="button"
                  disabled={visibleCreators.length === 0}
                  onClick={() =>
                    setCreatorUserIds(
                      allCreatorsSelected ? [] : creatorOptions.map((creator) => creator.id),
                    )
                  }
                >
                  {allCreatorsSelected ? "Quitar todas" : "Seleccionar todas"}
                </button>
              </div>

              <div className="ajustes-consecutive-dialog__people-toolbar">
                <label className="ajustes-consecutive-dialog__people-search">
                  <Search aria-hidden="true" />
                  <input
                    value={personSearch}
                    placeholder="Buscar por nombre o rol"
                    onChange={(event) => setPersonSearch(event.target.value)}
                  />
                </label>
                <div
                  className="ajustes-consecutive-dialog__people-tabs"
                  role="tablist"
                  aria-label="Filtrar personas"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={peopleView === "all"}
                    className={peopleView === "all" ? "is-active" : ""}
                    onClick={() => setPeopleView("all")}
                  >
                    Todas
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={peopleView === "selected"}
                    className={peopleView === "selected" ? "is-active" : ""}
                    onClick={() => setPeopleView("selected")}
                  >
                    Seleccionadas ({creatorUserIds.length})
                  </button>
                </div>
              </div>
            </div>

            {creatorOptionsQuery.isLoading ? (
              <p className="ajustes-consecutive-dialog__people-empty">Cargando personas…</p>
            ) : null}
            {creatorOptionsQuery.error ? (
              <p className="form-error" role="alert">
                No fue posible cargar las personas del centro.
              </p>
            ) : null}
            <div className="ajustes-consecutive-dialog__people-list">
              {visibleCreators.map((creator: ActividadGrupalTipoCreatorOption) => {
                const selected = creatorUserIds.includes(creator.id);

                return (
                  <button
                    key={creator.id}
                    type="button"
                    className={selected ? "is-selected" : ""}
                    aria-pressed={selected}
                    disabled={pending || !specialSeriesEnabled}
                    onClick={() => toggleCreator(creator.id)}
                  >
                    <span className="ajustes-consecutive-dialog__person-avatar" aria-hidden="true">
                      {getPersonInitials(creator.fullName)}
                    </span>
                    <span className="ajustes-consecutive-dialog__person-info">
                      <strong>{creator.fullName}</strong>
                      <small>{formatUserRole(creator.role)}</small>
                    </span>
                    <span
                      className="ajustes-consecutive-dialog__person-checkbox"
                      aria-hidden="true"
                    >
                      {selected ? <Check /> : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

        </div>

        <footer className="ajustes-consecutive-dialog__actions">
          <span className="ajustes-consecutive-dialog__dirty-state">
            <i aria-hidden="true" /> Cambios sin guardar
          </span>
          <button
            className="ajustes-consecutive-dialog__cancel"
            type="button"
            disabled={pending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="ajustes-consecutive-dialog__save"
            type="button"
            disabled={
              pending ||
              (!isPeopleMode && name.trim() === "") ||
              (specialSeriesEnabled &&
                (!/^[A-Z0-9]{2,24}$/.test(prefix) || creatorUserIds.length === 0))
            }
            onClick={() =>
              void onSave({
                name: isPeopleMode ? activityType.name : name.trim(),
                enabled: specialSeriesEnabled,
                prefix: specialSeriesEnabled ? prefix : undefined,
                nextValue: specialSeriesEnabled ? nextValue : undefined,
                creatorUserIds: specialSeriesEnabled ? creatorUserIds : [],
              })
            }
          >
            {pending ? "Guardando…" : isPeopleMode ? "Guardar permisos" : "Guardar cambios"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ActivityGlobalConsecutiveConfigDialog({
  activityName,
  initialConfig,
  tenantCount,
  activityTypes,
  tenants,
  seriesPending,
  peoplePending,
  onClose,
  onSaveSeries,
  onSavePeople,
}: {
  activityName: string;
  initialConfig: ActividadGrupalTipo["consecutiveConfig"];
  tenantCount: number;
  activityTypes: ActividadGrupalTipo[];
  tenants: Array<{ id: string; name: string }>;
  seriesPending: boolean;
  peoplePending: boolean;
  onClose: () => void;
  onSaveSeries: (payload: { enabled: boolean; prefix: string }) => void | Promise<void>;
  onSavePeople: (payload: {
    activityTypeId: string;
    creatorUserIds: string[];
  }) => void | Promise<void>;
}) {
  const [step, setStep] = useState<"series" | "people">("series");
  const [enabled, setEnabled] = useState(initialConfig !== null);
  const [prefix, setPrefix] = useState(initialConfig?.prefix ?? "");
  const [selectedActivityTypeId, setSelectedActivityTypeId] = useState(
    activityTypes[0]?.id ?? "",
  );
  const [personSearch, setPersonSearch] = useState("");
  const [creatorUserIds, setCreatorUserIds] = useState<string[]>([]);
  const tenantNameById = useMemo(
    () => new Map(tenants.map((tenant) => [tenant.id, tenant.name])),
    [tenants],
  );
  const selectedActivityType =
    activityTypes.find((activityType) => activityType.id === selectedActivityTypeId) ??
    activityTypes[0] ??
    null;
  const creatorOptionsQuery = useActividadGrupalTipoCreatorOptionsQuery(
    selectedActivityType?.id ?? null,
    step === "people" && selectedActivityType !== null,
  );
  const creatorOptions = creatorOptionsQuery.data?.creators ?? [];

  useEffect(() => {
    setEnabled(initialConfig !== null);
    setPrefix(initialConfig?.prefix ?? "");
  }, [initialConfig]);

  useEffect(() => {
    setCreatorUserIds(selectedActivityType?.consecutiveConfig?.creatorUserIds ?? []);
    setPersonSearch("");
  }, [selectedActivityTypeId, selectedActivityType?.consecutiveConfig?.creatorUserIds]);

  const normalizedPrefix = prefix.trim().toUpperCase();
  const validPrefix =
    normalizedPrefix.length >= 2 &&
    normalizedPrefix.length <= 24 &&
    normalizedPrefix.replace(/[A-Z0-9]/g, "") === "";
  const seriesHasUnsavedChanges =
    enabled !== (initialConfig !== null) ||
    (enabled && normalizedPrefix !== (initialConfig?.prefix ?? ""));
  const canConfigurePeople =
    !seriesHasUnsavedChanges &&
    selectedActivityType?.consecutiveConfig !== null &&
    selectedActivityType !== null;
  const visibleCreators = useMemo(() => {
    const normalizedSearch = personSearch.trim().toLocaleLowerCase("es");

    return creatorOptions.filter((creator) => {
      const searchable = `${creator.fullName} ${formatUserRole(creator.role)}`.toLocaleLowerCase(
        "es",
      );
      return normalizedSearch === "" || searchable.includes(normalizedSearch);
    });
  }, [creatorOptions, personSearch]);
  const allVisibleCreatorsSelected =
    visibleCreators.length > 0 &&
    visibleCreators.every((creator) => creatorUserIds.includes(creator.id));

  function toggleCreator(userId: string) {
    setCreatorUserIds((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  }

  function toggleVisibleCreators() {
    setCreatorUserIds((current) => {
      if (allVisibleCreatorsSelected) {
        const visibleIds = new Set(visibleCreators.map((creator) => creator.id));
        return current.filter((userId) => !visibleIds.has(userId));
      }

      return [...new Set([...current, ...visibleCreators.map((creator) => creator.id)])];
    });
  }

  async function saveSeriesAndContinue() {
    await onSaveSeries({ enabled, prefix: normalizedPrefix });
    setStep("people");
  }

  async function savePeople() {
    if (selectedActivityType === null) return;
    await onSavePeople({
      activityTypeId: selectedActivityType.id,
      creatorUserIds,
    });
  }

  return (
    <div
      className="actividad-delete-dialog-backdrop ajustes-consecutive-backdrop ajustes-global-series-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !seriesPending && !peoplePending) onClose();
      }}
    >
      <section
        className="ajustes-consecutive-dialog ajustes-global-series-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-global-series-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ajustes-consecutive-dialog__header ajustes-global-series-dialog__header">
          <div>
            <span className="ajustes-consecutive-dialog__badge">Todos los centros</span>
            <h2 id="activity-global-series-dialog-title">{activityName}</h2>
            <p className="ajustes-global-series-dialog__description">
              Prefijo común a los {tenantCount} centros. Cada centro lleva su propio consecutivo.
            </p>
          </div>
          <button
            className="ajustes-consecutive-dialog__close"
            type="button"
            aria-label="Cerrar"
            disabled={seriesPending || peoplePending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <nav className="ajustes-global-series-dialog__steps" aria-label="Configuración">
          <button
            type="button"
            className={step === "series" ? "is-active" : "is-complete"}
            aria-current={step === "series" ? "step" : undefined}
            onClick={() => setStep("series")}
          >
            <span aria-hidden="true">{step === "series" ? "1" : <Check />}</span>
            Serie
          </button>
          <button
            type="button"
            className={step === "people" ? "is-active" : ""}
            aria-current={step === "people" ? "step" : undefined}
            disabled={!canConfigurePeople}
            onClick={() => setStep("people")}
          >
            <span aria-hidden="true">2</span>
            Personas <small>{tenantCount}</small>
          </button>
        </nav>

        <div className="ajustes-consecutive-dialog__body ajustes-global-series-dialog__body">
          {step === "series" ? (
            <>
              <section
                className={
                  enabled
                    ? "ajustes-consecutive-dialog__series-card"
                    : "ajustes-consecutive-dialog__series-card is-collapsed"
                }
                aria-labelledby="activity-global-series-section-title"
              >
                <div className="ajustes-consecutive-dialog__series-header">
                  <div>
                    <h3 id="activity-global-series-section-title">Serie de la actividad</h3>
                    <p>
                      {enabled
                        ? "Las actas nuevas usan este prefijo en todos los centros."
                        : "Las actas nuevas usan la serie general."}
                    </p>
                  </div>
                  <button
                    className="ajustes-consecutive-dialog__switch"
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    aria-label="Usar prefijo para esta actividad"
                    disabled={seriesPending}
                    onClick={() => setEnabled((current) => !current)}
                  >
                    <span aria-hidden="true" />
                  </button>
                </div>

                {enabled ? (
                  <>
                    <div className="ajustes-consecutive-dialog__series-divider" />
                    <label className="ajustes-global-series-dialog__prefix-field">
                      <span>Prefijo</span>
                      <input
                        value={prefix}
                        maxLength={24}
                        placeholder="Ej. PSICO"
                        onChange={(event) => setPrefix(event.target.value.toUpperCase())}
                      />
                      <small>Mayúsculas y números, de 2 a 24 caracteres.</small>
                    </label>
                  </>
                ) : null}
              </section>

              <section className="ajustes-global-series-dialog__preview" aria-label="Próximas actas">
                <header>
                  <strong>Próxima acta por centro</strong>
                  <span>Consecutivo independiente</span>
                </header>
                <div>
                  {activityTypes.map((activityType) => {
                    const nextValue = activityType.consecutiveConfig?.nextValue ?? 1;
                    const code = enabled
                      ? `${normalizedPrefix || "PREFIJO"}-${String(nextValue).padStart(3, "0")}`
                      : "Serie general";
                    return (
                      <p key={activityType.id}>
                        <span>{tenantNameById.get(activityType.tenantId) ?? "Centro"}</span>
                        <code>{code}</code>
                      </p>
                    );
                  })}
                </div>
              </section>
            </>
          ) : (
            <section
              className="ajustes-global-series-dialog__people-panel"
              aria-labelledby="activity-global-people-title"
            >
              <label className="ajustes-global-series-dialog__center-select">
                <span>Centro</span>
                <select
                  value={selectedActivityType?.id ?? ""}
                  disabled={peoplePending || activityTypes.length === 0}
                  onChange={(event) => setSelectedActivityTypeId(event.target.value)}
                >
                  {activityTypes.map((activityType) => {
                    const personCount = activityType.consecutiveConfig?.creatorUserIds.length ?? 0;
                    return (
                      <option key={activityType.id} value={activityType.id}>
                        {(tenantNameById.get(activityType.tenantId) ?? "Centro") +
                          " · " +
                          personCount +
                          " personas"}
                      </option>
                    );
                  })}
                </select>
              </label>

              <div className="ajustes-global-series-dialog__people-heading">
                <h3 id="activity-global-people-title">
                  {creatorUserIds.length} de {creatorOptions.length} con permiso
                </h3>
                <button
                  type="button"
                  disabled={peoplePending || visibleCreators.length === 0}
                  onClick={toggleVisibleCreators}
                >
                  {allVisibleCreatorsSelected ? "Quitar selección" : "Seleccionar todas"}
                </button>
              </div>

              <label className="ajustes-global-series-dialog__people-search">
                <Search aria-hidden="true" />
                <input
                  value={personSearch}
                  placeholder="Buscar por nombre o cargo"
                  onChange={(event) => setPersonSearch(event.target.value)}
                />
              </label>

              {creatorOptionsQuery.isLoading ? (
                <p className="ajustes-global-series-dialog__muted">Cargando personas…</p>
              ) : null}
              {creatorOptionsQuery.isError ? (
                <p className="form-error" role="alert">
                  No fue posible cargar las personas del centro.
                </p>
              ) : null}
              {!creatorOptionsQuery.isLoading && visibleCreators.length === 0 ? (
                <p className="ajustes-global-series-dialog__muted">No encontramos personas.</p>
              ) : null}

              <div className="ajustes-global-series-dialog__people-list">
                {visibleCreators.map((creator: ActividadGrupalTipoCreatorOption) => {
                  const selected = creatorUserIds.includes(creator.id);
                  return (
                    <button
                      key={creator.id}
                      type="button"
                      className={selected ? "is-selected" : ""}
                      aria-pressed={selected}
                      disabled={peoplePending}
                      onClick={() => toggleCreator(creator.id)}
                    >
                      <span className="ajustes-global-series-dialog__person-avatar" aria-hidden="true">
                        {getPersonInitials(creator.fullName)}
                      </span>
                      <span className="ajustes-global-series-dialog__person-copy">
                        <strong>{creator.fullName}</strong>
                        <small>{formatUserRole(creator.role)}</small>
                      </span>
                      <span className="ajustes-global-series-dialog__person-check" aria-hidden="true">
                        {selected ? <Check /> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer className="ajustes-consecutive-dialog__actions ajustes-global-series-dialog__footer">
          <button
            className="ajustes-consecutive-dialog__cancel"
            type="button"
            disabled={seriesPending || peoplePending}
            onClick={onClose}
          >
            Cerrar
          </button>
          {step === "series" ? (
            <button
              className="ajustes-consecutive-dialog__save"
              type="button"
              disabled={seriesPending || (enabled && !validPrefix)}
              onClick={() => void saveSeriesAndContinue()}
            >
              {seriesPending ? "Guardando…" : "Guardar y continuar"}
            </button>
          ) : (
            <button
              className="ajustes-consecutive-dialog__save"
              type="button"
              disabled={peoplePending || creatorUserIds.length === 0}
              onClick={() => void savePeople()}
            >
              {peoplePending ? "Guardando…" : "Guardar personas"}
            </button>
          )}
        </footer>
      </section>
    </div>
  );
}

function getPersonInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "?") + (parts.at(-1)?.[0] ?? "?")).toUpperCase();
}

function formatActivityConsecutive(row: ActivityCatalogRow): string {
  const configs = row.activityTypes.map((activityType) => activityType.consecutiveConfig);

  if (configs.every((config) => config === null)) return "Serie general";

  const prefixes = new Set(configs.flatMap((config) => (config === null ? [] : [config.prefix])));

  if (row.isUnified) {
    return prefixes.size === 1 && configs.every((config) => config !== null)
      ? Array.from(prefixes)[0] + " · " + row.totalCount + " centros"
      : "Por centro";
  }

  const config = configs[0];
  return config === null || config === undefined
    ? "Serie general"
    : config.prefix + "-" + String(config.nextValue).padStart(3, "0");
}
function formatUserRole(role: string): string {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
