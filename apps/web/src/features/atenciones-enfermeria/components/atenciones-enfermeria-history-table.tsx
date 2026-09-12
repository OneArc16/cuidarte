import { type AtencionEnfermeriaListItem } from "@cuidarte/contracts";
import { Eye, Pencil, RotateCcw, Trash2 } from "lucide-react";

import {
  formatAtencionEnfermeriaAccess,
  formatAtencionEnfermeriaCareType,
  formatAtencionEnfermeriaGlucometria,
  formatAtencionEnfermeriaProfessionalRole,
  formatAtencionEnfermeriaTimestamp,
} from "../lib/atenciones-enfermeria-formatters";

type AtencionesEnfermeriaHistoryTableProps = {
  atenciones: AtencionEnfermeriaListItem[];
  isLoading: boolean;
  onOpenAtencion: (atencionId: string) => void;
  canManageTrash?: boolean;
  isTrash?: boolean;
  onDelete?: (atencionId: string) => void;
  onRestore?: (atencionId: string) => void;
};

export function AtencionesEnfermeriaHistoryTable({
  atenciones,
  isLoading,
  onOpenAtencion,
  canManageTrash = false,
  isTrash = false,
  onDelete,
  onRestore,
}: AtencionesEnfermeriaHistoryTableProps) {
  const columnCount = 6;

  return (
    <section className="adultos-table-wrap" aria-label="Historia de enfermería">
      <table className="adultos-table atencion-history-table atenciones-enfermeria-history-table">
        <thead>
          <tr>
            <th scope="col">Fecha y hora</th>
            <th scope="col">Tipo</th>
            <th scope="col">Signos y glucometría</th>
            <th scope="col">Autora</th>
            <th scope="col">Rol</th>
            <th scope="col">
              <span className="visually-hidden">Acceso</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount}>Cargando historia de enfermería...</td>
            </tr>
          ) : null}

          {!isLoading && atenciones.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>Este adulto todavía no tiene atenciones de enfermería.</td>
            </tr>
          ) : null}

          {atenciones.map((atencion) => {
            const accessLabel = formatAtencionEnfermeriaAccess(atencion.access);

            return (
              <tr key={atencion.id}>
                <td className="atenciones-enfermeria-cell-datetime">
                  {formatAtencionEnfermeriaTimestamp(
                    atencion.attentionDate,
                    atencion.attentionTime,
                  )}
                </td>
                <td>
                  <span className="atenciones-enfermeria-pill">
                    {formatAtencionEnfermeriaCareType(atencion.careType)}
                  </span>
                </td>
                <td className="atenciones-enfermeria-cell-measurements">
                  <span>{formatAtencionEnfermeriaGlucometria(atencion)}</span>
                  {atencion.reason !== null ? (
                    <small>{atencion.reason}</small>
                  ) : (
                    <small>Sin nota</small>
                  )}
                </td>
                <td className="atenciones-enfermeria-cell-author">
                  <strong>{atencion.professional.fullName}</strong>
                </td>
                <td>{formatAtencionEnfermeriaProfessionalRole(atencion.professional.role)}</td>
                <td className="atencion-history-actions">
                  {!isTrash ? (
                    <button
                      type="button"
                      className="outline-action atencion-history-action atenciones-enfermeria-history-action--access"
                      aria-label={`${accessLabel} atención`}
                      title={`${accessLabel} atención`}
                      onClick={() => onOpenAtencion(atencion.id)}
                    >
                      {atencion.access === "edit" ? (
                        <Pencil aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                      <span className="visually-hidden">{accessLabel}</span>
                    </button>
                  ) : null}
                  {canManageTrash && isTrash ? (
                    <button
                      type="button"
                      className="outline-action atencion-history-action atenciones-enfermeria-history-action--restore"
                      aria-label="Restaurar atención"
                      title="Restaurar atención"
                      onClick={() => onRestore?.(atencion.id)}
                    >
                      <RotateCcw aria-hidden="true" />
                      <span className="visually-hidden">Restaurar</span>
                    </button>
                  ) : null}
                  {canManageTrash && !isTrash ? (
                    <button
                      type="button"
                      className="danger-action atencion-history-action atenciones-enfermeria-history-action--delete"
                      aria-label="Eliminar atención"
                      title="Eliminar atención"
                      onClick={() => onDelete?.(atencion.id)}
                    >
                      <Trash2 aria-hidden="true" />
                      <span className="visually-hidden">Eliminar</span>
                    </button>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
