import { type EmpleadoPermissionsResponse, type UserPermission } from "@cuidarte/contracts";
import { Check, Save, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { resolveEmpleadosApiError } from "../lib/empleados-formatters";
import {
  useEmpleadoPermissionsQuery,
  useUpdateEmpleadoPermissionsMutation,
} from "../model/empleados-queries";

type EmpleadoPermissionsPanelProps = {
  empleadoId: string;
  enabled: boolean;
};

export function EmpleadoPermissionsPanel({ empleadoId, enabled }: EmpleadoPermissionsPanelProps) {
  const permissionsQuery = useEmpleadoPermissionsQuery(empleadoId, enabled);
  const updateMutation = useUpdateEmpleadoPermissionsMutation(empleadoId);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<UserPermission>>(new Set());

  useEffect(() => {
    if (permissionsQuery.data !== undefined) {
      setSelectedPermissions(new Set(permissionsQuery.data.permissions));
    }
  }, [permissionsQuery.data]);

  const groupedCatalog = useMemo(() => {
    const groups = new Map<string, EmpleadoPermissionsResponse["catalog"]>();

    for (const item of permissionsQuery.data?.catalog ?? []) {
      const group = groups.get(item.group) ?? [];
      group.push(item);
      groups.set(item.group, group);
    }

    return [...groups.entries()];
  }, [permissionsQuery.data?.catalog]);

  if (!enabled) {
    return null;
  }

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

  function savePermissions() {
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
    <section className="empleado-permissions-panel" aria-labelledby="empleado-permissions-title">
      <header className="empleado-permissions-panel__header">
        <div>
          <span className="empleado-permissions-panel__eyebrow">
            <ShieldCheck aria-hidden="true" />
            Administración individual
          </span>
          <h2 id="empleado-permissions-title">Permisos del empleado</h2>
          <p>Define qué puede ver y qué acciones puede realizar esta persona.</p>
        </div>
        <button
          className="primary-action empleado-permissions-panel__save"
          type="button"
          disabled={
            permissionsQuery.isLoading || permissionsQuery.isError || updateMutation.isPending
          }
          onClick={savePermissions}
        >
          <Save aria-hidden="true" />
          {updateMutation.isPending ? "Guardando…" : "Guardar permisos"}
        </button>
      </header>

      {permissionsQuery.isLoading ? (
        <p className="empleados-empty" aria-busy="true">
          Cargando permisos…
        </p>
      ) : null}

      {permissionsQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveEmpleadosApiError(permissionsQuery.error)}
        </p>
      ) : null}

      {permissionsQuery.data !== undefined ? (
        <div className="empleado-permissions-panel__groups">
          {groupedCatalog.map(([group, permissions]) => (
            <fieldset className="empleado-permissions-panel__group" key={group}>
              <legend>{group}</legend>
              <div className="empleado-permissions-panel__options">
                {permissions.map((permission) => {
                  const isSelected = selectedPermissions.has(permission.key);

                  return (
                    <label
                      className={"empleado-permission-option" + (isSelected ? " is-selected" : "")}
                      key={permission.key}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => togglePermission(permission.key)}
                      />
                      <span className="empleado-permission-option__check" aria-hidden="true">
                        {isSelected ? <Check /> : null}
                      </span>
                      <span className="empleado-permission-option__copy">
                        <strong>{permission.label}</strong>
                        <small>{permission.description}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </div>
      ) : null}
    </section>
  );
}
