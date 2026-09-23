import {
  type ActividadGrupalTipo,
  type AuthUser,
  type UserRole,
  userRoleValues,
} from "@cuidarte/contracts";
import { AlertTriangle, Hash, Info, Pencil, Plus, Power, PowerOff, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { useActividadGrupalTenantOptionsQuery } from "@/features/actividades-grupales/model/actividades-grupales-queries";
import { resolveActividadesGrupalesApiError } from "@/features/actividades-grupales/lib/actividades-grupales-formatters";
import {
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
      resolveActividadesGrupalesApiError(tenantOptionsQuery.error),
    [
      activityTypesQuery.error,
      createMutation.error,
      statusMutation.error,
      tenantOptionsQuery.error,
      updateMutation.error,
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
                              setEditingActivityTypeId(activityRow.id);
                              setEditingName(activityRow.name);
                            }}
                          >
                            <Pencil aria-hidden="true" />
                          </button>
                        )}
                        {!activityRow.isUnified ? (
                          <button
                            className="actividades-row-action actividades-row-action--acta"
                            type="button"
                            data-tooltip={`Configurar consecutivo: ${activityRow.name}`}
                            aria-label={`Configurar consecutivo de ${activityRow.name}`}
                            onClick={() => setActivityTypePendingConsecutiveConfig(activityRow.activityTypes[0] ?? null)}
                          >
                            <Hash aria-hidden="true" />
                          </button>
                        ) : null}
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
          onSave={(payload) => {
            consecutiveConfigMutation.mutate(
              { id: activityTypePendingConsecutiveConfig.id, payload },
              {
                onSuccess: () => {
                  toast.success("Configuración del consecutivo guardada.");
                  setActivityTypePendingConsecutiveConfig(null);
                },
              },
            );
          }}
        />
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
  pending,
  onClose,
  onSave,
}: {
  activityType: ActividadGrupalTipo;
  pending: boolean;
  onClose: () => void;
  onSave: (payload: { prefix: string; nextValue: number; creatorRoles: UserRole[] }) => void;
}) {
  const [prefix, setPrefix] = useState(activityType.consecutiveConfig?.prefix ?? "");
  const nextValue = activityType.consecutiveConfig?.nextValue ?? 1;
  const [creatorRoles, setCreatorRoles] = useState<UserRole[]>(
    activityType.consecutiveConfig?.creatorRoles ?? [],
  );
  const allRolesSelected = creatorRoles.length === userRoleValues.length;

  function toggleRole(role: UserRole) {
    setCreatorRoles((current) =>
      current.includes(role) ? current.filter((item) => item !== role) : [...current, role],
    );
  }

  return (
    <div
      className="actividad-delete-dialog-backdrop ajustes-consecutive-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
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
            <span className="ajustes-consecutive-dialog__badge">Serie especial</span>
            <h2 id="actividad-consecutive-title">{activityType.name}</h2>
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

        <div className="ajustes-consecutive-dialog__notice">
          <Info aria-hidden="true" />
          <span>Las actas existentes no se modifican. El nuevo consecutivo se aplicará a partir de la próxima sesión creada.</span>
        </div>

        <div className="ajustes-consecutive-dialog__fields">
          <label>
            <span>Prefijo</span>
            <input
              value={prefix}
              maxLength={24}
              placeholder="BELLEZA"
              onChange={(event) => setPrefix(event.target.value.toUpperCase())}
            />
          </label>
          <div className="ajustes-consecutive-dialog__readonly-field">
            <span>Próximo consecutivo</span>
            <strong>{String(nextValue).padStart(3, "0")}</strong>
          </div>
        </div>
        <p className="ajustes-consecutive-dialog__preview">
          Próxima acta: <code>{prefix.trim() === "" ? "PREFIJO" : prefix.trim()}-{String(nextValue).padStart(3, "0")}</code>
        </p>

        <div className="ajustes-consecutive-dialog__divider" />

        <div className="ajustes-consecutive-dialog__roles-header">
          <div>
            <h3>Roles con permiso</h3>
            <p>Quiénes pueden crear esta actividad · {creatorRoles.length} seleccionados</p>
          </div>
          <button type="button" onClick={() => setCreatorRoles(allRolesSelected ? [] : [...userRoleValues])}>
            {allRolesSelected ? "Quitar todos" : "Seleccionar todos"}
          </button>
        </div>
        <div className="ajustes-consecutive-dialog__role-chips">
          {userRoleValues.map((role) => {
            const selected = creatorRoles.includes(role);

            return (
              <button
                key={role}
                type="button"
                className={selected ? "is-selected" : ""}
                aria-pressed={selected}
                onClick={() => toggleRole(role)}
              >
                {selected ? <span aria-hidden="true">✓</span> : null}
                {formatUserRole(role)}
              </button>
            );
          })}
        </div>

        <footer className="ajustes-consecutive-dialog__actions">
          <button className="ajustes-consecutive-dialog__cancel" type="button" disabled={pending} onClick={onClose}>
            Cancelar
          </button>
          <button
            className="ajustes-consecutive-dialog__save"
            type="button"
            disabled={pending || !/^[A-Z0-9]{2,24}$/.test(prefix) || creatorRoles.length === 0}
            onClick={() => onSave({ prefix, nextValue, creatorRoles })}
          >
            {pending ? "Guardando…" : "Guardar consecutivo"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatActivityConsecutive(row: ActivityCatalogRow): string {
  if (row.isUnified) return "Por centro";

  const config = row.activityTypes[0]?.consecutiveConfig;
  return config === null || config === undefined
    ? "Serie general"
    : `${config.prefix}-${String(config.nextValue).padStart(3, "0")}`;
}

function formatUserRole(role: UserRole): string {
  return role.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
