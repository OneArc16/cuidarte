import { type ActividadGrupalChangeLogEntry } from "@cuidarte/contracts";

import {
  formatActividadGrupalTrashTimestamp,
  formatActaNumber,
} from "../lib/actividades-grupales-formatters";

type ActividadesGrupalesChangeLogTableProps = {
  entries: ActividadGrupalChangeLogEntry[];
  isLoading: boolean;
  showTenantColumn: boolean;
};

export function ActividadesGrupalesChangeLogTable({
  entries,
  isLoading,
  showTenantColumn,
}: ActividadesGrupalesChangeLogTableProps) {
  if (isLoading) {
    return <p role="status">Cargando historial de cambios...</p>;
  }

  return (
    <div className="actividades-table-wrap">
      <table className="actividades-table actividades-change-log-table">
        <thead>
          <tr>
            <th scope="col">Acta</th>
            <th scope="col">Sesión</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">Acción</th>
            <th scope="col">Antes / después</th>
            <th scope="col">Realizada por</th>
            <th scope="col">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={showTenantColumn ? 7 : 6}>No hay cambios registrados.</td>
            </tr>
          ) : (
            entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <strong>{formatActaNumber(entry.actaNumber)}</strong>
                </td>
                <td>
                  <strong>{entry.activityName}</strong>
                </td>
                {showTenantColumn ? <td>{entry.tenantName}</td> : null}
                <td>
                  <span
                    className={`actividades-change-log-action actividades-change-log-action--${entry.action}`}
                  >
                    {entry.action === "deleted" ? "Eliminación" : "Edición"}
                  </span>
                </td>
                <td className="actividades-change-log-changes">
                  {entry.changes.length === 0 ? (
                    <span className="muted-copy">
                      No hay detalle disponible para este cambio histórico.
                    </span>
                  ) : (
                    entry.changes.map((change) => (
                      <div key={change.field} className="actividades-change-log-change">
                        <strong>{change.field}</strong>
                        <span>Antes: {change.before ?? "Sin valor"}</span>
                        <span>Después: {change.after ?? "Sin valor"}</span>
                      </div>
                    ))
                  )}
                </td>
                <td>
                  <strong>{entry.actorUserFullName}</strong>
                </td>
                <td>{formatActividadGrupalTrashTimestamp(entry.occurredAt)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
