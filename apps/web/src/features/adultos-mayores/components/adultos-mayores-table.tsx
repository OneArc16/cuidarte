import { type AdultoMayorListItem } from "@cuidarte/contracts";
import { ClipboardPlus, HeartPulse, Pencil, Trash2, Utensils } from "lucide-react";

import {
  formatAdultoMayorDocument,
  formatAdultoMayorPhone,
  formatAdultoMayorSex,
} from "../lib/adultos-mayores-formatters";

type AdultosMayoresTableProps = {
  adultosMayores: AdultoMayorListItem[];
  canManageAlimentacion: boolean;
  canCreateAtencionIndividual: boolean;
  canManageAdultosMayores: boolean;
  canOpenHistoriaClinica: boolean;
  canManageTrash: boolean;
  hideAtencionIndividualAction: boolean;
  isLoading: boolean;
  showTenantColumn: boolean;
  onOpenAlimentacion: (adultoMayorId: string) => void;
  onOpenAtencionIndividual: (adultoMayorId: string) => void;
  onOpenHistoriaClinica: (adultoMayorId: string) => void;
  onEdit: (adultoMayorId: string) => void;
  onSendToTrash: (adultoMayor: AdultoMayorListItem) => void;
};

export function AdultosMayoresTable({
  adultosMayores,
  canManageAlimentacion,
  canCreateAtencionIndividual,
  canManageAdultosMayores,
  canOpenHistoriaClinica,
  canManageTrash,
  hideAtencionIndividualAction,
  isLoading,
  onOpenAlimentacion,
  onOpenAtencionIndividual,
  onOpenHistoriaClinica,
  onEdit,
  onSendToTrash,
  showTenantColumn,
}: AdultosMayoresTableProps) {
  const columnCount = showTenantColumn ? 8 : 7;

  return (
    <section className="adultos-table-wrap" aria-label="Adultos mayores registrados">
      <table className="adultos-table">
        <thead>
          <tr>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">Documento</th>
            <th scope="col">Nombres</th>
            <th scope="col">Apellidos</th>
            <th scope="col">Telefono</th>
            <th scope="col">Edad</th>
            <th scope="col">Sexo</th>
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
              <td colSpan={columnCount}>Sin adultos mayores registrados.</td>
            </tr>
          ) : null}

          {adultosMayores.map((adultoMayor) => (
            <tr key={adultoMayor.id}>
              {showTenantColumn ? <td>{adultoMayor.tenantName}</td> : null}
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
              <td>
                <div className="adultos-row-actions">
                  {canManageAlimentacion ? (
                    <button
                      className="adultos-row-action adultos-row-action--alimentacion"
                      type="button"
                      aria-label={`Alimentacion de ${adultoMayor.names} ${adultoMayor.surnames}`}
                      title="Alimentacion"
                      onClick={() => onOpenAlimentacion(adultoMayor.id)}
                    >
                      <Utensils aria-hidden="true" />
                    </button>
                  ) : null}
                  {hideAtencionIndividualAction ? null : (
                    <button
                      className="adultos-row-action adultos-row-action--atencion"
                      type="button"
                      aria-label={`Atencion individual de ${adultoMayor.names} ${adultoMayor.surnames}`}
                      title="Atencion individual"
                      disabled={!canCreateAtencionIndividual}
                      onClick={() => onOpenAtencionIndividual(adultoMayor.id)}
                    >
                      <HeartPulse aria-hidden="true" />
                    </button>
                  )}
                  {canManageAdultosMayores ? (
                    <button
                      className="adultos-row-action adultos-row-action--editar"
                      type="button"
                      aria-label={`Editar ${adultoMayor.names} ${adultoMayor.surnames}`}
                      title="Editar"
                      onClick={() => onEdit(adultoMayor.id)}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  ) : null}
                  {canManageTrash ? (
                    <button
                      className="adultos-row-action adultos-row-action--trash"
                      type="button"
                      aria-label={`Enviar a papelera ${adultoMayor.names} ${adultoMayor.surnames}`}
                      title="Enviar a papelera"
                      onClick={() => onSendToTrash(adultoMayor)}
                    >
                      <Trash2 aria-hidden="true" />
                    </button>
                  ) : null}
                  <button
                    className="adultos-row-action adultos-row-action--historia"
                    type="button"
                    aria-label={`Historia clinica de ${adultoMayor.names} ${adultoMayor.surnames}`}
                    title="Historia clinica"
                    disabled={!canOpenHistoriaClinica}
                    onClick={() => onOpenHistoriaClinica(adultoMayor.id)}
                  >
                    <ClipboardPlus aria-hidden="true" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
