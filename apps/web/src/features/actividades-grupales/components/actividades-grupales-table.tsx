import { type ActividadGrupalListItem } from "@cuidarte/contracts";
import { ClipboardPenLine, FileText } from "lucide-react";

import {
  formatActividadGrupalOrganizer,
  formatActividadGrupalType,
  formatActivitySchedule,
  formatActaNumber,
} from "../lib/actividades-grupales-formatters";

type ActividadesGrupalesTableProps = {
  actividadesGrupales: ActividadGrupalListItem[];
  canManageActividadesGrupales: boolean;
  isLoading: boolean;
  onOpenDiligenciamiento: (actividad: ActividadGrupalListItem) => void;
  onOpenActaPdf: (actividad: ActividadGrupalListItem) => void;
  showTenantColumn: boolean;
};

export function ActividadesGrupalesTable({
  actividadesGrupales,
  canManageActividadesGrupales,
  isLoading,
  onOpenDiligenciamiento,
  onOpenActaPdf,
  showTenantColumn,
}: ActividadesGrupalesTableProps) {
  if (isLoading) {
    return (
      <div className="actividades-table-wrap" role="status">
        <table className="actividades-table">
          <tbody>
            <tr>
              <td>Cargando actividades...</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="actividades-table-wrap">
      <table
        className={`actividades-table ${showTenantColumn ? "actividades-table--with-tenant" : "actividades-table--without-tenant"}`}
      >
        <colgroup>
          <col className="actividades-col-acta" />
          <col className="actividades-col-actividad" />
          <col className="actividades-col-tipo" />
          <col className="actividades-col-fecha" />
          <col className="actividades-col-horario" />
          <col className="actividades-col-organizador" />
          {showTenantColumn ? <col className="actividades-col-centro" /> : null}
          <col className="actividades-col-acciones" />
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
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {actividadesGrupales.length === 0 ? (
            <tr>
              <td colSpan={showTenantColumn ? 8 : 7}>No hay actividades registradas.</td>
            </tr>
          ) : (
            actividadesGrupales.map((actividad) => (
              <tr key={actividad.id}>
                <td className="actividades-cell-acta">
                  <strong>{formatActaNumber(actividad.actaNumber)}</strong>
                </td>
                <td className="actividades-cell-activity">
                  {canManageActividadesGrupales ? (
                    <button
                      className="actividades-activity-trigger"
                      type="button"
                      title="Diligenciar actividad"
                      onClick={() => onOpenDiligenciamiento(actividad)}
                    >
                      <strong>{actividad.activityName}</strong>
                    </button>
                  ) : (
                    <strong>{actividad.activityName}</strong>
                  )}
                </td>
                <td>{formatActividadGrupalType(actividad.activityType)}</td>
                <td>{actividad.activityDate}</td>
                <td>{formatActivitySchedule(actividad.startTime, actividad.endTime)}</td>
                <td>{formatActividadGrupalOrganizer(actividad.organizer)}</td>
                {showTenantColumn ? <td>{actividad.tenantName}</td> : null}
                <td>
                  <div className="actividades-row-actions">
                    {canManageActividadesGrupales ? (
                      <button
                        className="actividades-row-action"
                        type="button"
                        aria-label={`Diligenciar actividad ${actividad.activityName}`}
                        title="Diligenciar actividad"
                        onClick={() => onOpenDiligenciamiento(actividad)}
                      >
                        <ClipboardPenLine aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      className="actividades-row-action"
                      type="button"
                      aria-label={`Ver PDF del acta ${formatActaNumber(actividad.actaNumber)}`}
                      title="Ver PDF del acta"
                      onClick={() => onOpenActaPdf(actividad)}
                    >
                      <FileText aria-hidden="true" />
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
