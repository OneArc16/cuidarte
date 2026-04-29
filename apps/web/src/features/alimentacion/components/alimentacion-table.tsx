import { type AlimentacionListItem } from "@cuidarte/contracts";
import { Pencil } from "lucide-react";

import {
  formatAlimentacionOrganizer,
  formatAlimentacionStatus,
} from "../lib/alimentacion-formatters";

type AlimentacionTableProps = {
  canManageAlimentacion: boolean;
  isLoading: boolean;
  records: AlimentacionListItem[];
  showTenantColumn: boolean;
  onOpenEdit: (recordId: string) => void;
};

export function AlimentacionTable({
  canManageAlimentacion,
  isLoading,
  onOpenEdit,
  records,
  showTenantColumn,
}: AlimentacionTableProps) {
  if (isLoading) {
    return (
      <div className="alimentacion-table-wrap" role="status">
        <table className="alimentacion-table">
          <tbody>
            <tr>
              <td>Cargando registros...</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  const columnCount = showTenantColumn ? 10 : 9;

  return (
    <div className="alimentacion-table-wrap">
      <table
        className={`alimentacion-table ${showTenantColumn ? "alimentacion-table--with-tenant" : "alimentacion-table--without-tenant"}`}
      >
        <colgroup>
          <col className="alimentacion-col-documento" />
          <col className="alimentacion-col-nombre" />
          <col className="alimentacion-col-fecha" />
          <col className="alimentacion-col-organizador" />
          <col className="alimentacion-col-estado" />
          <col className="alimentacion-col-estado" />
          <col className="alimentacion-col-estado" />
          <col className="alimentacion-col-estado" />
          {showTenantColumn ? <col className="alimentacion-col-centro" /> : null}
          <col className="alimentacion-col-acciones" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Cédula</th>
            <th scope="col">Nombre</th>
            <th scope="col">Fecha</th>
            <th scope="col">Organizador</th>
            <th scope="col">Refrigerio 1</th>
            <th scope="col">Almuerzo</th>
            <th scope="col">Refrigerio 2</th>
            <th scope="col">Auxilio Transporte</th>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">Acción</th>
          </tr>
        </thead>
        <tbody>
          {records.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>No hay registros de alimentación para los filtros actuales.</td>
            </tr>
          ) : (
            records.map((record) => (
              <tr key={record.id}>
                <td>{record.documentNumber}</td>
                <td className="alimentacion-cell-name">
                  {canManageAlimentacion ? (
                    <button
                      className="alimentacion-record-trigger"
                      type="button"
                      title="Editar registro de alimentación"
                      onClick={() => onOpenEdit(record.id)}
                    >
                      <strong>{record.fullName}</strong>
                    </button>
                  ) : (
                    <strong>{record.fullName}</strong>
                  )}
                </td>
                <td>{record.deliveryDate}</td>
                <td>{formatAlimentacionOrganizer(record.organizer)}</td>
                <td>{formatAlimentacionStatus(record.refrigerio1)}</td>
                <td>{formatAlimentacionStatus(record.almuerzo)}</td>
                <td>{formatAlimentacionStatus(record.refrigerio2)}</td>
                <td>{formatAlimentacionStatus(record.auxilioTransporte)}</td>
                {showTenantColumn ? <td>{record.tenantName}</td> : null}
                <td>
                  {canManageAlimentacion ? (
                    <button
                      className="alimentacion-row-action"
                      type="button"
                      aria-label={`Editar alimentación de ${record.fullName}`}
                      title="Editar registro"
                      onClick={() => onOpenEdit(record.id)}
                    >
                      <Pencil aria-hidden="true" />
                    </button>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
