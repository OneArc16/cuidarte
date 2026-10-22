import {
  reportDashboardChartCatalog,
  type EmpleadoListItem,
  type ReportDashboardChartPermission,
  type UserPermission,
} from "@cuidarte/contracts";
import { BarChart3, Check, Search, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
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

type AjustesReportChartPermissionsDialogProps = {
  onClose: () => void;
};

export function AjustesReportChartPermissionsDialog({
  onClose,
}: AjustesReportChartPermissionsDialogProps) {
  const [search, setSearch] = useState("");
  const [selectedEmpleado, setSelectedEmpleado] = useState<EmpleadoListItem | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<UserPermission>>(new Set());
  const empleadosQuery = useEmpleadosQuery({ search });
  const empleados = empleadosQuery.data?.empleados ?? [];
  const selectedEmpleadoId = selectedEmpleado?.id ?? null;
  const permissionsQuery = useEmpleadoPermissionsQuery(
    selectedEmpleadoId ?? "",
    selectedEmpleadoId !== null,
  );
  const updateMutation = useUpdateEmpleadoPermissionsMutation(selectedEmpleadoId ?? "");

  useEffect(() => {
    const firstEmpleado = empleados[0];
    if (selectedEmpleado === null && firstEmpleado !== undefined)
      setSelectedEmpleado(firstEmpleado);
  }, [empleados, selectedEmpleado]);

  useEffect(() => {
    setSelectedPermissions(new Set(permissionsQuery.data?.permissions ?? []));
  }, [permissionsQuery.data]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const selectedCharts = reportDashboardChartCatalog.filter((chart) =>
    selectedPermissions.has(chart.key),
  );
  const hasChanges =
    permissionsQuery.data !== undefined &&
    (permissionsQuery.data.permissions.length !== selectedPermissions.size ||
      permissionsQuery.data.permissions.some((permission) => !selectedPermissions.has(permission)));

  function toggleChart(chart: ReportDashboardChartPermission) {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      if (next.has(chart)) next.delete(chart);
      else next.add(chart);
      return next;
    });
  }

  function setAllCharts(enabled: boolean) {
    setSelectedPermissions((current) => {
      const next = new Set(current);
      for (const chart of reportDashboardChartCatalog) {
        if (enabled) next.add(chart.key);
        else next.delete(chart.key);
      }
      return next;
    });
  }

  function save() {
    if (selectedEmpleadoId === null) return;
    updateMutation.mutate(
      { permissions: [...selectedPermissions] },
      { onSuccess: () => toast.success("Permisos de gráficos guardados.") },
    );
  }

  return (
    <div
      className="ajustes-report-chart-dialog-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target) onClose();
      }}
    >
      <section
        className="ajustes-report-chart-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-chart-permissions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="ajustes-report-chart-dialog__header">
          <div>
            <span>
              <BarChart3 aria-hidden="true" /> Reportes
            </span>
            <h2 id="report-chart-permissions-title">Permisos de gráficos</h2>
            <p>Elige qué gráficos verá cada persona en Reportes, PDF y PowerPoint.</p>
          </div>
          <button type="button" aria-label="Cerrar" onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="ajustes-report-chart-dialog__body">
          <aside>
            <label className="ajustes-report-chart-dialog__search">
              <Search aria-hidden="true" />
              <span className="visually-hidden">Buscar persona</span>
              <input
                value={search}
                placeholder="Buscar persona"
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            {empleadosQuery.isError ? (
              <p className="form-error">{resolveEmpleadosApiError(empleadosQuery.error)}</p>
            ) : null}
            <div
              className="ajustes-report-chart-dialog__people"
              role="listbox"
              aria-label="Personas"
            >
              {empleados.map((empleado) => (
                <PersonOption
                  key={empleado.id}
                  empleado={empleado}
                  selected={empleado.id === selectedEmpleado?.id}
                  onSelect={() => setSelectedEmpleado(empleado)}
                />
              ))}
            </div>
          </aside>

          <div className="ajustes-report-chart-dialog__editor">
            {selectedEmpleado === null ? (
              <div className="ajustes-report-chart-dialog__empty">
                <ShieldCheck aria-hidden="true" />
                <p>Selecciona una persona para configurar sus gráficos.</p>
              </div>
            ) : (
              <>
                <div className="ajustes-report-chart-dialog__employee">
                  <div>
                    <strong>{selectedEmpleado.fullName}</strong>
                    <span>{formatEmpleadoRole(selectedEmpleado.role)}</span>
                  </div>
                  <span>
                    {selectedCharts.length} de {reportDashboardChartCatalog.length} gráficos
                  </span>
                </div>
                {permissionsQuery.isError ? (
                  <p className="form-error">{resolveEmpleadosApiError(permissionsQuery.error)}</p>
                ) : null}
                <div className="ajustes-report-chart-dialog__tools">
                  <span>Los cambios también se aplican a las nuevas exportaciones.</span>
                  <div>
                    <button type="button" onClick={() => setAllCharts(true)}>
                      Permitir todos
                    </button>
                    <button type="button" onClick={() => setAllCharts(false)}>
                      Ocultar todos
                    </button>
                  </div>
                </div>
                <div className="ajustes-report-chart-dialog__cards">
                  {reportDashboardChartCatalog.map((chart) => {
                    const checked = selectedPermissions.has(chart.key);
                    return (
                      <label className={checked ? "is-selected" : ""} key={chart.key}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleChart(chart.key)}
                        />
                        <span className="ajustes-report-chart-dialog__check" aria-hidden="true">
                          {checked ? <Check /> : null}
                        </span>
                        <span>
                          <strong>{chart.label}</strong>
                          <small>{chart.description}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>

        <footer>
          <button
            className="primary-action ajustes-report-chart-dialog__save"
            type="button"
            disabled={
              selectedEmpleadoId === null ||
              permissionsQuery.isLoading ||
              updateMutation.isPending ||
              !hasChanges
            }
            onClick={save}
          >
            <Check aria-hidden="true" />
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
      className={selected ? "is-selected" : ""}
      type="button"
      role="option"
      aria-selected={selected}
      onClick={onSelect}
    >
      <span>{getInitials(empleado.fullName)}</span>
      <span>
        <strong>{empleado.fullName}</strong>
        <small>{formatEmpleadoRole(empleado.role)}</small>
      </span>
    </button>
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
