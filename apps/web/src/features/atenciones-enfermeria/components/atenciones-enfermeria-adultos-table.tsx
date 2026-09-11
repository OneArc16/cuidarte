import { type AdultoMayorListItem } from "@cuidarte/contracts";
import { ClipboardPlus, HeartPulse } from "lucide-react";

import {
  formatAdultoMayorDocument,
  formatAdultoMayorPhone,
  formatAdultoMayorSex,
} from "@/features/adultos-mayores/lib/adultos-mayores-formatters";

type AtencionesEnfermeriaAdultosTableProps = {
  adultosMayores: AdultoMayorListItem[];
  canCreateAtencion: boolean;
  isLoading: boolean;
  showTenantColumn: boolean;
  onOpenAtencion: (adultoMayorId: string) => void;
  onOpenHistory: (adultoMayorId: string) => void;
};

export function AtencionesEnfermeriaAdultosTable({
  adultosMayores,
  canCreateAtencion,
  isLoading,
  onOpenAtencion,
  onOpenHistory,
  showTenantColumn,
}: AtencionesEnfermeriaAdultosTableProps) {
  const columnCount = showTenantColumn ? 8 : 7;

  return (
    <section className="atenciones-enfermeria-table-wrap" aria-label="Adultos mayores disponibles">
      <table className="atenciones-enfermeria-table">
        <thead>
          <tr>
            <th scope="col">Documento</th>
            <th scope="col">Nombres</th>
            <th scope="col">Apellidos</th>
            <th scope="col">Telefono</th>
            <th scope="col">Edad</th>
            <th scope="col">Sexo</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
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
              <td colSpan={columnCount}>Sin adultos mayores registrados para el filtro actual.</td>
            </tr>
          ) : null}

          {adultosMayores.map((adultoMayor) => (
            <tr key={adultoMayor.id}>
              <td>
                {formatAdultoMayorDocument(adultoMayor.documentType, adultoMayor.documentNumber)}
              </td>
              <td>
                <strong>{adultoMayor.names}</strong>
              </td>
              <td>
                <strong>{adultoMayor.surnames}</strong>
              </td>
              <td>{formatAdultoMayorPhone(adultoMayor.phone)}</td>
              <td>{adultoMayor.age}</td>
              <td>{formatAdultoMayorSex(adultoMayor.sex)}</td>
              {showTenantColumn ? <td>{adultoMayor.tenantName}</td> : null}
              <td>
                <div className="atenciones-enfermeria-row-actions">
                  <button
                    type="button"
                    className="atenciones-enfermeria-row-action"
                    aria-label={`Historia de enfermería de ${adultoMayor.names} ${adultoMayor.surnames}`}
                    title="Historia de enfermería"
                    onClick={() => onOpenHistory(adultoMayor.id)}
                  >
                    <ClipboardPlus aria-hidden="true" />
                  </button>
                  {canCreateAtencion ? (
                    <button
                      type="button"
                      className="atenciones-enfermeria-row-action"
                      aria-label={`Nueva atención de enfermería de ${adultoMayor.names} ${adultoMayor.surnames}`}
                      title="Nueva atención de enfermería"
                      onClick={() => onOpenAtencion(adultoMayor.id)}
                    >
                      <HeartPulse aria-hidden="true" />
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
