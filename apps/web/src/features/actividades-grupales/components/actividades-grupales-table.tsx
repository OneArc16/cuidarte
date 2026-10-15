import { type ActividadGrupalListItem } from "@cuidarte/contracts";
import { ClipboardPenLine, Eye, FileText, PencilLine, Trash2 } from "lucide-react";

import {
  formatActividadGrupalOrganizer,
  formatActividadGrupalTimestamp,
  formatActivitySchedule,
  formatActaNumber,
} from "../lib/actividades-grupales-formatters";

type ActividadesGrupalesTableProps = {
  actividadesGrupales: ActividadGrupalListItem[];
  isLoading: boolean;
  onDelete: (actividad: ActividadGrupalListItem) => void;
  onEdit: (actividad: ActividadGrupalListItem) => void;
  onOpenDiligenciamiento: (actividad: ActividadGrupalListItem) => void;
  onOpenActaPdf: (actividad: ActividadGrupalListItem) => void;
  showTenantColumn: boolean;
  showCreationTimestampColumn: boolean;
};

export function ActividadesGrupalesTable({
  actividadesGrupales,
  isLoading,
  onDelete,
  onEdit,
  onOpenDiligenciamiento,
  onOpenActaPdf,
  showTenantColumn,
  showCreationTimestampColumn,
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
        className={`actividades-table ${showTenantColumn ? "actividades-table--with-tenant" : "actividades-table--without-tenant"} ${showCreationTimestampColumn ? "actividades-table--with-created-at" : ""}`}
      >
        <colgroup>
          <col className="actividades-col-acta" />
          <col className="actividades-col-actividad" />
          <col className="actividades-col-tipo" />
          <col className="actividades-col-fecha" />
          <col className="actividades-col-horario" />
          <col className="actividades-col-organizador" />
          {showTenantColumn ? <col className="actividades-col-centro" /> : null}
          {showCreationTimestampColumn ? <col className="actividades-col-creada-el" /> : null}
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
            {showCreationTimestampColumn ? <th scope="col">Creada el</th> : null}
            <th scope="col">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {actividadesGrupales.length === 0 ? (
            <tr>
              <td colSpan={7 + Number(showTenantColumn) + Number(showCreationTimestampColumn)}>
                No hay actividades registradas.
              </td>
            </tr>
          ) : (
            actividadesGrupales.map((actividad) => (
              <tr key={actividad.id}>
                <td className="actividades-cell-acta">
                  <strong>{formatActaNumber(actividad.actaNumber)}</strong>
                </td>
                <td className="actividades-cell-activity">
                  <button
                    className="actividades-activity-trigger"
                    type="button"
                    data-tooltip={actividad.canEdit ? "Diligenciar actividad" : "Ver actividad"}
                    onClick={() => onOpenDiligenciamiento(actividad)}
                  >
                    <strong>{actividad.activityName}</strong>
                  </button>
                </td>
                <td className="actividades-cell-type">
                  {actividad.activityTypeCatalog.name}
                  {actividad.activityTypeCatalog.isActive ? "" : " (Inactiva)"}
                </td>
                <td>{actividad.activityDate}</td>
                <td>{formatActivitySchedule(actividad.startTime, actividad.endTime)}</td>
                <td className="actividades-cell-organizer">
                  {formatActividadGrupalOrganizer(actividad.organizer)}
                </td>
                {showTenantColumn ? (
                  <td className="actividades-cell-centro">{actividad.tenantName}</td>
                ) : null}
                {showCreationTimestampColumn ? (
                  <td className="actividades-cell-created-at">
                    <time dateTime={actividad.createdAt}>
                      {formatActividadGrupalTimestamp(actividad.createdAt)}
                    </time>
                  </td>
                ) : null}
                <td>
                  <div className="actividades-row-actions">
                    <button
                      className={`actividades-row-action ${actividad.canEdit ? "actividades-row-action--diligenciar" : "actividades-row-action--ver"}`}
                      type="button"
                      aria-label={
                        actividad.canEdit
                          ? `Diligenciar actividad ${actividad.activityName}`
                          : `Ver actividad ${actividad.activityName}`
                      }
                      data-tooltip={actividad.canEdit ? "Diligenciar actividad" : "Ver actividad"}
                      onClick={() => onOpenDiligenciamiento(actividad)}
                    >
                      {actividad.canEdit ? (
                        <ClipboardPenLine aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </button>
                    {actividad.canEdit ? (
                      <button
                        className="actividades-row-action actividades-row-action--editar"
                        type="button"
                        aria-label={`Editar actividad ${actividad.activityName}`}
                        data-tooltip="Editar actividad"
                        onClick={() => onEdit(actividad)}
                      >
                        <PencilLine aria-hidden="true" />
                      </button>
                    ) : null}
                    <button
                      className="actividades-row-action actividades-row-action--acta"
                      type="button"
                      aria-label={`Ver PDF del acta ${formatActaNumber(actividad.actaNumber)}`}
                      data-tooltip="Ver PDF del acta"
                      onClick={() => onOpenActaPdf(actividad)}
                    >
                      <FileText aria-hidden="true" />
                    </button>
                    {actividad.canDelete ? (
                      <button
                        className="actividades-row-action actividades-row-action--delete"
                        type="button"
                        aria-label={`Eliminar la actividad ${actividad.activityName}`}
                        data-tooltip="Eliminar acta"
                        onClick={() => onDelete(actividad)}
                      >
                        <Trash2 aria-hidden="true" />
                      </button>
                    ) : null}
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
