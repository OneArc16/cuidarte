import { Fragment, useState } from "react";

import { type ActividadGrupalChangeLogEntry } from "@cuidarte/contracts";

import {
  formatActividadGrupalTrashTimestamp,
  formatActaNumber,
} from "../lib/actividades-grupales-formatters";
import { describeUserAgent } from "../lib/describe-user-agent";

type ActividadesGrupalesChangeLogTableProps = {
  entries: ActividadGrupalChangeLogEntry[];
  isLoading: boolean;
  showTenantColumn: boolean;
};

const LONG_VALUE_THRESHOLD = 90;
const EMPTY_VALUE_LABEL = "Sin valor";
/** Separates a short summary from its details, e.g. "3 asignado(s) · Agregó: names". */
const DETAIL_SEPARATOR = " · ";

function splitChangeValue(value: string | null): { summary: string; details: string[] } {
  if (value === null) {
    return { summary: EMPTY_VALUE_LABEL, details: [] };
  }

  const [summary = value, ...details] = value.split(DETAIL_SEPARATOR);

  return { summary, details };
}

function hasLongValues(entry: ActividadGrupalChangeLogEntry) {
  return entry.changes.some(
    (change) =>
      (change.before?.length ?? 0) > LONG_VALUE_THRESHOLD ||
      (change.after?.length ?? 0) > LONG_VALUE_THRESHOLD ||
      splitChangeValue(change.before).details.length > 0 ||
      splitChangeValue(change.after).details.length > 0,
  );
}

export function ActividadesGrupalesChangeLogTable({
  entries,
  isLoading,
  showTenantColumn,
}: ActividadesGrupalesChangeLogTableProps) {
  const [expandedEntryIds, setExpandedEntryIds] = useState<Set<string>>(() => new Set());

  if (isLoading) {
    return <p role="status">Cargando historial de cambios...</p>;
  }

  const columnCount = showTenantColumn ? 7 : 6;

  function toggleEntry(entryId: string) {
    setExpandedEntryIds((current) => {
      const next = new Set(current);
      if (next.has(entryId)) {
        next.delete(entryId);
      } else {
        next.add(entryId);
      }
      return next;
    });
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
            <th scope="col">Modificado por</th>
            <th scope="col">Fecha</th>
          </tr>
        </thead>
        <tbody>
          {entries.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>No hay cambios registrados.</td>
            </tr>
          ) : (
            entries.map((entry) => {
              const isExpandable = hasLongValues(entry);
              const isExpanded = isExpandable && expandedEntryIds.has(entry.id);
              const detailId = `change-log-detail-${entry.id}`;

              return (
                <Fragment key={entry.id}>
                  <tr className={isExpanded ? "actividades-change-log-row--expanded" : undefined}>
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
                        <>
                          {entry.changes.map((change) => (
                            <div key={change.field} className="actividades-change-log-change">
                              <strong>{change.field}</strong>
                              <span className="actividades-change-log-preview">
                                Antes: {splitChangeValue(change.before).summary}
                              </span>
                              <span className="actividades-change-log-preview">
                                Después: {splitChangeValue(change.after).summary}
                              </span>
                            </div>
                          ))}
                          {isExpandable ? (
                            <button
                              type="button"
                              className="actividades-change-log-toggle"
                              aria-expanded={isExpanded}
                              aria-controls={detailId}
                              onClick={() => toggleEntry(entry.id)}
                            >
                              {isExpanded ? "Ocultar detalle" : "Ver detalle completo"}
                            </button>
                          ) : null}
                        </>
                      )}
                    </td>
                    <td>
                      <strong>{entry.actorUserFullName}</strong>
                      <ChangeLogOrigin
                        ip={entry.actorIp ?? null}
                        userAgent={entry.actorUserAgent ?? null}
                      />
                    </td>
                    <td>{formatActividadGrupalTrashTimestamp(entry.occurredAt)}</td>
                  </tr>
                  {isExpanded ? (
                    <tr className="actividades-change-log-detail-row">
                      <td colSpan={columnCount} id={detailId}>
                        <div className="actividades-change-log-detail">
                          {entry.changes.map((change) => (
                            <section
                              key={change.field}
                              className="actividades-change-log-detail__field"
                              aria-label={`Cambio en ${change.field}`}
                            >
                              <h4>{change.field}</h4>
                              <div className="actividades-change-log-detail__compare">
                                <div className="actividades-change-log-detail__panel actividades-change-log-detail__panel--before">
                                  <span className="actividades-change-log-detail__label">
                                    Antes
                                  </span>
                                  <ChangeValueDetail value={change.before} />
                                </div>
                                <div className="actividades-change-log-detail__panel actividades-change-log-detail__panel--after">
                                  <span className="actividades-change-log-detail__label">
                                    Después
                                  </span>
                                  <ChangeValueDetail value={change.after} />
                                </div>
                              </div>
                            </section>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function ChangeValueDetail({ value }: { value: string | null }) {
  const { summary, details } = splitChangeValue(value);

  return (
    <>
      <p>{summary}</p>
      {details.map((detail) => (
        <p key={detail}>{detail}</p>
      ))}
    </>
  );
}

function ChangeLogOrigin({ ip, userAgent }: { ip: string | null; userAgent: string | null }) {
  const device = describeUserAgent(userAgent);

  if (ip === null && device === null) {
    return <span className="actividades-change-log-origin">Origen no registrado</span>;
  }

  return (
    <span className="actividades-change-log-origin" title={userAgent ?? undefined}>
      {ip === null ? null : <span>IP {ip}</span>}
      {device === null ? null : <span>{device}</span>}
    </span>
  );
}
