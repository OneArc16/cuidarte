import { type NutricionAdultoResumen } from "@cuidarte/contracts";
import { ClipboardPlus, Utensils } from "lucide-react";

import { formatAdultoMayorDocument } from "@/features/adultos-mayores/lib/adultos-mayores-formatters";

import { formatNutricionSex } from "../lib/nutricion-formatters";

type NutricionAdultosTableProps = {
  adultosMayores: NutricionAdultoResumen[];
  canCreateAttention: boolean;
  isLoading: boolean;
  isUpdating: boolean;
  showTenantColumn: boolean;
  onOpenAttention: (adultoMayorId: string) => void;
  onOpenHistory: (adultoMayorId: string) => void;
};

export function NutricionAdultosTable({
  adultosMayores,
  canCreateAttention,
  isLoading,
  isUpdating,
  onOpenAttention,
  onOpenHistory,
  showTenantColumn,
}: NutricionAdultosTableProps) {
  const columnCount = showTenantColumn ? 7 : 6;

  return (
    <section
      className={`nutricion-table-wrap${isUpdating ? " nutricion-table-wrap--updating" : ""}`}
      aria-label="Adultos mayores para nutrición"
      aria-busy={isLoading || isUpdating}
    >
      {isUpdating ? (
        <span className="visually-hidden" role="status">
          Actualizando página...
        </span>
      ) : null}
      <table className="nutricion-table">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Nombre</th>
            <th scope="col">Teléfono</th>
            <th scope="col">Edad</th>
            <th scope="col">Sexo</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">
              <span className="visually-hidden">Acciones nutricionales</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount}>Cargando adultos mayores...</td>
            </tr>
          ) : null}
          {!isLoading && adultosMayores.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>No hay adultos mayores para el filtro actual.</td>
            </tr>
          ) : null}
          {adultosMayores.map((adultoMayor) => (
            <tr key={adultoMayor.id}>
              <td>
                {formatAdultoMayorDocument(adultoMayor.documentType, adultoMayor.documentNumber)}
              </td>
              <td>
                <strong>{adultoMayor.fullName}</strong>
              </td>
              <td>{adultoMayor.phone ?? "Sin teléfono"}</td>
              <td>{adultoMayor.age}</td>
              <td>{formatNutricionSex(adultoMayor.sex)}</td>
              {showTenantColumn ? <td>{adultoMayor.tenantName}</td> : null}
              <td>
                <div className="nutricion-row-actions">
                  <button
                    className="nutricion-row-action nutricion-row-action--history"
                    type="button"
                    aria-label={`Historial nutricional de ${adultoMayor.fullName}`}
                    data-tooltip="Historial nutricional"
                    onClick={() => onOpenHistory(adultoMayor.id)}
                  >
                    <ClipboardPlus aria-hidden="true" />
                  </button>
                  {canCreateAttention ? (
                    <button
                      className="nutricion-row-action nutricion-row-action--attention"
                      type="button"
                      aria-label={`Nueva atención nutricional de ${adultoMayor.fullName}`}
                      data-tooltip="Nueva atención nutricional"
                      onClick={() => onOpenAttention(adultoMayor.id)}
                    >
                      <Utensils aria-hidden="true" />
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
