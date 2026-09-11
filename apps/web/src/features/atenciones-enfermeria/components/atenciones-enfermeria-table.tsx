import { type AtencionEnfermeriaListItem } from "@cuidarte/contracts";
import { Eye, Pencil } from "lucide-react";

import {
  formatAtencionEnfermeriaAccess,
  formatAtencionEnfermeriaCareType,
  formatAtencionEnfermeriaGlucometria,
  formatAtencionEnfermeriaProfessionalRole,
  formatAtencionEnfermeriaTimestamp,
} from "../lib/atenciones-enfermeria-formatters";

type AtencionesEnfermeriaTableProps = {
  atenciones: AtencionEnfermeriaListItem[];
  isLoading: boolean;
  showTenantColumn: boolean;
  onOpenAtencion: (atencionId: string) => void;
};

export function AtencionesEnfermeriaTable({
  atenciones,
  isLoading,
  onOpenAtencion,
  showTenantColumn,
}: AtencionesEnfermeriaTableProps) {
  const columnCount = showTenantColumn ? 8 : 7;

  return (
    <section className="atenciones-enfermeria-table-wrap" aria-label="Atenciones de enfermería">
      <table className="atenciones-enfermeria-table">
        <thead>
          <tr>
            <th scope="col">Fecha</th>
            <th scope="col">Adulto mayor</th>
            <th scope="col">Documento</th>
            <th scope="col">Tipo</th>
            <th scope="col">Signos y glucometría</th>
            <th scope="col">Profesional</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">
              <span className="visually-hidden">Acceso</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount}>Cargando atenciones de enfermería...</td>
            </tr>
          ) : null}

          {!isLoading && atenciones.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>Sin atenciones de enfermería para los filtros actuales.</td>
            </tr>
          ) : null}

          {atenciones.map((atencion) => (
            <tr key={atencion.id}>
              <td className="atenciones-enfermeria-cell-datetime">
                {formatAtencionEnfermeriaTimestamp(atencion.attentionDate, atencion.attentionTime)}
              </td>
              <td>
                <strong>{atencion.adultoMayor.fullName}</strong>
              </td>
              <td>{atencion.adultoMayor.documentNumber}</td>
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
              <td>
                <strong>{atencion.professional.fullName}</strong>
                <small>
                  {formatAtencionEnfermeriaProfessionalRole(atencion.professional.role)}
                </small>
              </td>
              {showTenantColumn ? <td>{atencion.tenantName}</td> : null}
              <td>
                <button
                  type="button"
                  className="atenciones-enfermeria-access"
                  data-access={atencion.access}
                  aria-label={`Acceso ${formatAtencionEnfermeriaAccess(atencion.access)}`}
                  onClick={() => onOpenAtencion(atencion.id)}
                >
                  {atencion.access === "edit" ? (
                    <Pencil aria-hidden="true" />
                  ) : (
                    <Eye aria-hidden="true" />
                  )}
                  <span>{formatAtencionEnfermeriaAccess(atencion.access)}</span>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
