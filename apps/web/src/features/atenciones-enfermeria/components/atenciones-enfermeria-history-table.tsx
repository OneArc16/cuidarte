import { type AtencionEnfermeriaListItem } from "@cuidarte/contracts";
import { Eye, Pencil } from "lucide-react";

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
};

export function AtencionesEnfermeriaHistoryTable({
  atenciones,
  isLoading,
  onOpenAtencion,
}: AtencionesEnfermeriaHistoryTableProps) {
  const columnCount = 6;

  return (
    <section className="adultos-table-wrap" aria-label="Historia de enfermería">
      <table className="adultos-table atencion-history-table">
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
                  {formatAtencionEnfermeriaTimestamp(atencion.attentionDate, atencion.attentionTime)}
                </td>
                <td>
                  <span className="atenciones-enfermeria-pill">
                    {formatAtencionEnfermeriaCareType(atencion.careType)}
                  </span>
                </td>
                <td className="atenciones-enfermeria-cell-measurements">
                  <span>{formatAtencionEnfermeriaGlucometria(atencion)}</span>
                  {atencion.reason !== null ? <small>{atencion.reason}</small> : <small>Sin nota</small>}
                </td>
                <td className="atenciones-enfermeria-cell-author">
                  <strong>{atencion.professional.fullName}</strong>
                </td>
                <td>{formatAtencionEnfermeriaProfessionalRole(atencion.professional.role)}</td>
                <td>
                  <button
                    type="button"
                    className="outline-action atencion-history-action"
                    aria-label={`Acceso ${accessLabel}`}
                    onClick={() => onOpenAtencion(atencion.id)}
                  >
                    {atencion.access === "edit" ? (
                      <Pencil aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                    <span>{accessLabel}</span>
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}
