import { type AtencionIndividualHistoryItem } from "@cuidarte/contracts";
import { Eye, Pencil } from "lucide-react";

import { formatEmpleadoRole } from "@/features/empleados/lib/empleados-formatters";

import {
  formatAtencionHistoryAction,
  formatAtencionHistoryDate,
  MODALIDAD_LABELS,
  TIPO_CONSULTA_LABELS,
} from "../lib/atenciones-individuales-formatters";

type HistoriaClinicaTableProps = {
  atenciones: AtencionIndividualHistoryItem[];
  isLoading: boolean;
  onOpenAtencion: (atencion: AtencionIndividualHistoryItem) => void;
};

export function HistoriaClinicaTable({
  atenciones,
  isLoading,
  onOpenAtencion,
}: HistoriaClinicaTableProps) {
  return (
    <section className="adultos-table-wrap" aria-label="Atenciones registradas en historia clinica">
      <table className="adultos-table atencion-history-table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Consecutivo</th>
            <th scope="col">Consulta</th>
            <th scope="col">Modalidad</th>
            <th scope="col">Tipo</th>
            <th scope="col">Profesional</th>
            <th scope="col">Rol</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={8}>Cargando historia clinica...</td>
            </tr>
          ) : null}

          {!isLoading && atenciones.length === 0 ? (
            <tr>
              <td colSpan={8}>No hay atenciones registradas para este adulto mayor.</td>
            </tr>
          ) : null}

          {atenciones.map((atencion) => {
            const actionLabel = formatAtencionHistoryAction(atencion.access);

            return (
              <tr key={atencion.id}>
                <td>{formatAtencionHistoryDate(atencion.attentionDate)}</td>
                <td>#{atencion.consecutive}</td>
                <td>
                  <strong>{atencion.nombreConsulta}</strong>
                </td>
                <td>{MODALIDAD_LABELS[atencion.modalidad]}</td>
                <td>{TIPO_CONSULTA_LABELS[atencion.tipoConsulta]}</td>
                <td>{atencion.professional.fullName}</td>
                <td>{formatEmpleadoRole(atencion.professional.role)}</td>
                <td>
                  <button
                    className="outline-action atencion-history-action"
                    type="button"
                    aria-label={actionLabel}
                    title={actionLabel}
                    onClick={() => onOpenAtencion(atencion)}
                  >
                    {atencion.access === "edit" ? (
                      <Pencil aria-hidden="true" />
                    ) : (
                      <Eye aria-hidden="true" />
                    )}
                    <span className="visually-hidden">{actionLabel}</span>
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
