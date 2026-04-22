import { type BackofficeTenantListItem } from "@cuidarte/contracts";
import { ChevronRight } from "lucide-react";

import { BACKOFFICE_PATH } from "../lib/backoffice-paths";
import { formatDocument, formatLocation } from "../lib/backoffice-formatters";
import { StatusBadge } from "./status-badge";

type TenantTableProps = {
  isLoading: boolean;
  tenants: BackofficeTenantListItem[];
  onOpenTenant: (tenantPath: string) => void;
};

export function TenantTable({ isLoading, tenants, onOpenTenant }: TenantTableProps) {
  return (
    <section className="backoffice-table-wrap" aria-label="Tenants registrados">
      <table className="backoffice-table">
        <thead>
          <tr>
            <th scope="col">Centro</th>
            <th scope="col">Documento</th>
            <th scope="col">Contacto</th>
            <th scope="col">Ubicación</th>
            <th scope="col">Propietario</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={7}>Cargando tenants...</td>
            </tr>
          ) : null}

          {!isLoading && tenants.length === 0 ? (
            <tr>
              <td colSpan={7}>Sin tenants registrados.</td>
            </tr>
          ) : null}

          {tenants.map((item) => (
            <tr key={item.tenant.id}>
              <td>
                <strong>{item.tenant.name}</strong>
                <span>{item.tenant.email ?? "Sin correo"}</span>
              </td>
              <td>{formatDocument(item.tenant.documentType, item.tenant.documentNumber)}</td>
              <td>{item.tenant.phone ?? "Sin teléfono"}</td>
              <td>{formatLocation(item.tenant.city, item.tenant.department)}</td>
              <td>
                <strong>{item.owner?.fullName ?? "Sin propietario"}</strong>
                <span>{item.owner?.email ?? "Pendiente"}</span>
              </td>
              <td>
                <StatusBadge isActive={item.tenant.isActive} />
              </td>
              <td>
                <button
                  className="icon-action"
                  type="button"
                  aria-label={`Abrir ${item.tenant.name}`}
                  onClick={() => onOpenTenant(`${BACKOFFICE_PATH}/tenants/${item.tenant.id}`)}
                >
                  <ChevronRight aria-hidden="true" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
