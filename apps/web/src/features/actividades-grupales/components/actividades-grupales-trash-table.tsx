import { type ActividadGrupalTrashListItem } from "@cuidarte/contracts";
import { RotateCcw } from "lucide-react";

import {
  formatActividadGrupalOrganizer,
  formatActividadGrupalTrashTimestamp,
  formatActividadGrupalType,
  formatActivitySchedule,
  formatActaNumber,
} from "../lib/actividades-grupales-formatters";

type ActividadesGrupalesTrashTableProps = {
  actividadesGrupales: ActividadGrupalTrashListItem[];
  isLoading: boolean;
  onRestore: (actividad: ActividadGrupalTrashListItem) => void;
  showTenantColumn: boolean;
};

export function ActividadesGrupalesTrashTable({
  actividadesGrupales,
  isLoading,
  onRestore,
  showTenantColumn,
}: ActividadesGrupalesTrashTableProps) {
  if (isLoading) {
    return (
      <div className="actividades-table-wrap" role="status">
        <table className="actividades-table">
          <tbody>
            <tr>
              <td>Cargando papelera...</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="actividades-table-wrap">
      <table
        className={`actividades-table actividades-trash-table ${showTenantColumn ? "actividades-trash-table--with-tenant" : "actividades-trash-table--without-tenant"}`}
      >
        <colgroup>
          <col className="actividades-trash-col-acta" />
          <col className="actividades-trash-col-actividad" />
          <col className="actividades-trash-col-tipo" />
          <col className="actividades-trash-col-fecha" />
          <col className="actividades-trash-col-horario" />
          <col className="actividades-trash-col-organizador" />
          {showTenantColumn ? <col className="actividades-trash-col-centro" /> : null}
          <col className="actividades-trash-col-eliminada-por" />
          <col className="actividades-trash-col-eliminada-el" />
          <col className="actividades-trash-col-acciones" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Acta</th>
            <th scope="col">Actividad</th>
            <th scope="col">Tipo</th>
            <th scope="col">Fecha</th>
            <th scope="col">Horario</th>
            <th scope="col">Organizador</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">Eliminada por</th>
            <th scope="col">Eliminada el</th>
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {actividadesGrupales.length === 0 ? (
            <tr>
              <td colSpan={showTenantColumn ? 10 : 9}>No hay actas en la papelera.</td>
            </tr>
          ) : (
            actividadesGrupales.map((actividad) => (
              <tr key={actividad.id}>
                <td className="actividades-cell-acta">
                  <strong>{formatActaNumber(actividad.actaNumber)}</strong>
                </td>
                <td className="actividades-cell-activity">
                  <strong>{actividad.activityName}</strong>
                </td>
                <td className="actividades-cell-type">
                  {formatActividadGrupalType(actividad.activityType)}
                </td>
                <td>{actividad.activityDate}</td>
                <td>{formatActivitySchedule(actividad.startTime, actividad.endTime)}</td>
                <td className="actividades-cell-organizer">
                  {formatActividadGrupalOrganizer(actividad.organizer)}
                </td>
                {showTenantColumn ? (
                  <td className="actividades-cell-centro">{actividad.tenantName}</td>
                ) : null}
                <td>
                  <strong>{actividad.deletedByUserFullName}</strong>
                  <small className="muted-copy">ID {actividad.deletedByUserId}</small>
                </td>
                <td>
                  <strong>{formatActividadGrupalTrashTimestamp(actividad.deletedAt)}</strong>
                </td>
                <td>
                  <div className="actividades-row-actions">
                    <button
                      className="actividades-row-action"
                      type="button"
                      aria-label={`Restaurar acta ${formatActaNumber(actividad.actaNumber)}`}
                      title={actividad.canRestore ? "Restaurar acta" : "No tienes permisos para restaurar"}
                      disabled={!actividad.canRestore}
                      onClick={() => onRestore(actividad)}
                    >
                      <RotateCcw aria-hidden="true" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
