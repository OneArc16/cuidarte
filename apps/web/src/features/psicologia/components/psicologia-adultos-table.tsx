import { type PsicologiaAdultoResumen } from "@cuidarte/contracts";
import { ClipboardPlus, MessageCircleHeart } from "lucide-react";

import { formatAdultoMayorDocument } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";
type Props = {
  adultos: PsicologiaAdultoResumen[];
  canCreate: boolean;
  loading: boolean;
  showTenant: boolean;
  onHistory: (id: string) => void;
  onCreate: (id: string) => void;
};
export function PsicologiaAdultosTable({
  adultos,
  canCreate,
  loading,
  showTenant,
  onHistory,
  onCreate,
}: Props) {
  const columns = showTenant ? 7 : 6;
  return (
    <section className="psicologia-table-wrap" aria-label="Adultos mayores para psicología">
      <table>
        <thead>
          <tr>
            <th>Documento</th>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Edad</th>
            <th>Sexo</th>
            {showTenant ? <th>Centro</th> : null}
            <th>
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns}>Cargando adultos mayores...</td>
            </tr>
          ) : null}
          {!loading && adultos.length === 0 ? (
            <tr>
              <td colSpan={columns}>No hay adultos mayores para el filtro actual.</td>
            </tr>
          ) : null}
          {adultos.map((adulto) => (
            <tr key={adulto.id}>
              <td>{formatAdultoMayorDocument(adulto.documentType, adulto.documentNumber)}</td>
              <td>
                <strong>{adulto.fullName}</strong>
              </td>
              <td>{adulto.phone ?? "Sin teléfono"}</td>
              <td>{adulto.age}</td>
              <td>
                {adulto.sex === "female"
                  ? "Femenino"
                  : adulto.sex === "male"
                    ? "Masculino"
                    : "Otro"}
              </td>
              {showTenant ? <td>{adulto.tenantName}</td> : null}
              <td>
                <div className="psicologia-row-actions">
                  <button
                    className="psicologia-row-action psicologia-row-action--history"
                    type="button"
                    aria-label={`Historial de sesiones de ${adulto.fullName}`}
                    data-tooltip="Historial de sesiones"
                    onClick={() => onHistory(adulto.id)}
                  >
                    <ClipboardPlus aria-hidden="true" />
                  </button>
                  {canCreate ? (
                    <button
                      className="psicologia-row-action psicologia-row-action--session"
                      type="button"
                      aria-label={`Nueva sesión de psicología de ${adulto.fullName}`}
                      data-tooltip="Nueva sesión"
                      onClick={() => onCreate(adulto.id)}
                    >
                      <MessageCircleHeart aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
