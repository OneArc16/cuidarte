import {
  type EmpleadoListItem,
  type EmpleadoPermissionsResponse,
  type UserPermission,
} from "@cuidarte/contracts";
import { Check, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  formatEmpleadoRole,
  resolveEmpleadosApiError,
} from "@/features/empleados/lib/empleados-formatters";
import {
  useEmpleadoPermissionsQuery,
  useEmpleadosQuery,
  useUpdateEmpleadoPermissionsMutation,
} from "@/features/empleados/model/empleados-queries";

type AjustesPermissionsDialogProps = {
  onClose: () => void;
};

const PERMISSION_COLUMNS = [
  { key: "view", label: "VER" },
  { key: "create", label: "CREAR" },
  { key: "edit", label: "EDITAR" },
  { key: "delete", label: "ELIMINAR" },
  { key: "correct", label: "CORREGIR" },
  { key: "import", label: "IMPORTAR" },
  { key: "export", label: "EXPORTAR" },
  { key: "manage", label: "GESTIONAR" },
] as const;

const MODULE_DESCRIPTIONS: Record<string, string> = {
  Inicio: "Tablero principal",
  Empleados: "Listado, registro y datos del personal",
  "Actividades grupales": "Actas y sesiones grupales",
  "Adultos mayores": "Registro e información de adultos mayores",
  Alimentación: "Registros de alimentación",
  "Atenciones individuales": "Historias clínicas y atenciones",
  Enfermería: "Atenciones de enfermería",
  Reportes: "Informes y exportaciones",
  Ajustes: "Configuraciones del sistema",
};

export function AjustesPermissionsDialog({ onClose }: AjustesPermissionsDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedEmpleadoId, setSelectedEmpleadoId] = useState<string | null>(null);
  const empleadosQuery = useEmpleadosQuery({ search });
  const empleados = empleadosQuery.data?.empleados ?? [];
  const selectedEmpleado = empleados.find((empleado) => empleado.id === selectedEmpleadoId) ?? null;
  const permissionsQuery = useEmpleadoPermissionsQuery(
    selectedEmpleadoId ?? "",
    selectedEmpleadoId !== null,
  );
  const updateMutation = useUpdateEmpleadoPermissionsMutation(selectedEmpleadoId ?? "");
  const [selectedPermissions, setSelectedPermissions] = useState<Set<UserPermission>>(new Set());

  useEffect(() => {
    if (
      selectedEmpleadoId !== null &&
      empleados.some((empleado) => empleado.id === selectedEmpleadoId)
    ) {
      return;
    }

    setSelectedEmpleadoId(empleados[0]?.id ?? null);
  }, [empleados, selectedEmpleadoId]);

  useEffect(() => {
    setSelectedPermissions(new Set(permissionsQuery.data?.permissions ?? []));
  }, [permissionsQuery.data]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, EmpleadoPermissionsResponse["catalog"]>();

    for (const item of permissionsQuery.data?.catalog ?? []) {
      const group = groups.get(item.group) ?? [];
      group.push(item);
      groups.set(item.group, group);
    }

    return [...groups.entries()];
  }, [permissionsQuery.data?.catalog]);

  const catalogKeys = permissionsQuery.data?.catalog.map((permission) => permission.key) ?? [];
  const allPermissionsSelected =
    catalogKeys.length > 0 &&
    catalogKeys.every((permission) => selectedPermissions.has(permission));
  const hasChanges =
    permissionsQuery.data !== undefined &&
    (permissionsQuery.data.permissions.length !== selectedPermissions.size ||
      permissionsQuery.data.permissions.some((permission) => !selectedPermissions.has(permission)));

  function togglePermission(permission: UserPermission) {
    setSelectedPermissions((current) => {
      const next = new Set(current);

      if (next.has(permission)) {
        next.delete(permission);
      } else {
        next.add(permission);
      }

      return next;
    });
  }

  function toggleAllPermissions() {
    setSelectedPermissions(new Set(allPermissionsSelected ? [] : catalogKeys));
  }

  function savePermissions() {
    if (selectedEmpleadoId === null) return;

    updateMutation.mutate(
      { permissions: [...selectedPermissions] },
      {
        onSuccess: () => {
          toast.success("Permisos guardados.");
        },
      },
    );
  }

  return (
    <div
      className="ajustes-permissions-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="ajustes-permissions-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="ajustes-permissions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ajustes-permissions-dialog__header">
          <div>
            <span className="ajustes-permissions-dialog__eyebrow">
              <ShieldCheck aria-hidden="true" /> Seguridad
            </span>
            <h2 id="ajustes-permissions-title">Permisos por persona</h2>
            <p>Define qué puede consultar y gestionar cada empleado.</p>
          </div>
          <button
            className="ajustes-permissions-dialog__close"
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="ajustes-permissions-dialog__body">
          <aside className="ajustes-permissions-dialog__people">
            <div className="ajustes-permissions-dialog__people-heading">
              <span>Personas</span>
              <strong>{empleados.length}</strong>
            </div>
            <label className="ajustes-permissions-dialog__search">
              <span className="visually-hidden">Buscar persona</span>
              <div>
                <Search aria-hidden="true" />
                <input
                  value={search}
                  placeholder="Buscar persona"
                  aria-label="Buscar persona"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </label>

            {empleadosQuery.isLoading ? (
              <p className="ajustes-permissions-dialog__muted">Cargando personas...</p>
            ) : null}
            {empleadosQuery.isError ? (
              <p className="form-error" role="alert">
                {resolveEmpleadosApiError(empleadosQuery.error)}
              </p>
            ) : null}
            {!empleadosQuery.isLoading && empleados.length === 0 ? (
              <p className="ajustes-permissions-dialog__muted">No encontramos personas.</p>
            ) : null}

            <div
              className="ajustes-permissions-dialog__people-list"
              role="listbox"
              aria-label="Personas"
            >
              {empleados.map((empleado) => (
                <PersonOption
                  key={empleado.id}
                  empleado={empleado}
                  selected={empleado.id === selectedEmpleadoId}
                  onSelect={() => setSelectedEmpleadoId(empleado.id)}
                />
              ))}
            </div>
          </aside>

          <div className="ajustes-permissions-dialog__editor">
            {selectedEmpleado !== null ? (
              <>
                <header className="ajustes-permissions-dialog__employee-header">
                  <span className="ajustes-permissions-dialog__employee-avatar" aria-hidden="true">
                    {getInitials(selectedEmpleado.fullName)}
                  </span>
                  <div className="ajustes-permissions-dialog__employee-copy">
                    <strong>{selectedEmpleado.fullName}</strong>
                    <span>
                      {formatEmpleadoRole(selectedEmpleado.role)} · {selectedEmpleado.email}
                    </span>
                  </div>
                  <div className="ajustes-permissions-dialog__permission-count">
                    <strong>{selectedPermissions.size}</strong>
                    <span>de {permissionsQuery.data?.catalog.length ?? 0} permisos</span>
                    <button type="button" onClick={toggleAllPermissions}>
                      {allPermissionsSelected ? "Quitar selección" : "Seleccionar todo"}
                    </button>
                  </div>
                </header>

                {permissionsQuery.isLoading ? (
                  <p className="ajustes-permissions-dialog__muted" aria-busy="true">
                    Cargando permisos...
                  </p>
                ) : null}
                {permissionsQuery.isError ? (
                  <p className="form-error" role="alert">
                    {resolveEmpleadosApiError(permissionsQuery.error)}
                  </p>
                ) : null}

                {permissionsQuery.data !== undefined ? (
                  <div className="ajustes-permissions-dialog__matrix-scroll">
                    <div className="ajustes-permissions-dialog__matrix">
                      <div className="ajustes-permissions-dialog__matrix-row ajustes-permissions-dialog__matrix-row--heading">
                        <span>Módulo</span>
                        {PERMISSION_COLUMNS.map((column) => (
                          <span key={column.key}>{column.label}</span>
                        ))}
                      </div>
                      {groupedCatalog.map(([group, permissions]) => (
                        <PermissionRow
                          key={group}
                          group={group}
                          permissions={permissions}
                          selectedPermissions={selectedPermissions}
                          onToggle={togglePermission}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}
              </>
            ) : (
              <div className="ajustes-permissions-dialog__empty">
                <ShieldCheck aria-hidden="true" />
                <strong>Selecciona una persona</strong>
                <p>Sus permisos aparecerán aquí para que puedas administrarlos.</p>
              </div>
            )}
          </div>
        </div>

        <footer className="ajustes-permissions-dialog__footer">
          <button
            className="primary-action ajustes-permissions-dialog__save"
            type="button"
            disabled={
              selectedEmpleadoId === null ||
              permissionsQuery.isLoading ||
              permissionsQuery.isError ||
              updateMutation.isPending ||
              !hasChanges
            }
            onClick={savePermissions}
          >
            {updateMutation.isPending ? "Guardando…" : "Guardar permisos"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function PersonOption({
  empleado,
  selected,
  onSelect,
}: {
  empleado: EmpleadoListItem;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      className={
        selected
          ? "ajustes-permissions-dialog__person is-selected"
          : "ajustes-permissions-dialog__person"
      }
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
    >
      <span className="ajustes-permissions-dialog__avatar" aria-hidden="true">
        {getInitials(empleado.fullName)}
      </span>
      <span>
        <strong>{empleado.fullName}</strong>
        <small>{formatEmpleadoRole(empleado.role)}</small>
      </span>
    </button>
  );
}

function PermissionRow({
  group,
  permissions,
  selectedPermissions,
  onToggle,
}: {
  group: string;
  permissions: EmpleadoPermissionsResponse["catalog"];
  selectedPermissions: Set<UserPermission>;
  onToggle: (permission: UserPermission) => void;
}) {
  return (
    <div className="ajustes-permissions-dialog__matrix-row">
      <div className="ajustes-permissions-dialog__module-copy">
        <strong>{group}</strong>
        <small>{MODULE_DESCRIPTIONS[group] ?? "Permisos del módulo"}</small>
      </div>
      {PERMISSION_COLUMNS.map((column) => {
        const permission = permissions.find((item) => item.key.endsWith(`.${column.key}`));

        return permission ? (
          <label
            className={
              selectedPermissions.has(permission.key)
                ? "ajustes-permissions-dialog__matrix-check is-selected"
                : "ajustes-permissions-dialog__matrix-check"
            }
            key={column.key}
            title={permission.description}
          >
            <input
              type="checkbox"
              checked={selectedPermissions.has(permission.key)}
              aria-label={`${permission.label} — ${group}`}
              onChange={() => onToggle(permission.key)}
            />
            <span aria-hidden="true">
              {selectedPermissions.has(permission.key) ? <Check /> : null}
            </span>
          </label>
        ) : (
          <span className="ajustes-permissions-dialog__matrix-unavailable" key={column.key}>
            —
          </span>
        );
      })}
    </div>
  );
}

function getInitials(fullName: string): string {
  return fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}
