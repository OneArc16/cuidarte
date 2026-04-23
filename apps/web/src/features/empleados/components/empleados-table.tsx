import { type EmpleadoListItem } from "@cuidarte/contracts";
import { Eye, Pencil } from "lucide-react";

import {
  formatEmpleadoDocument,
  formatEmpleadoPhone,
  formatEmpleadoRole,
  formatEmpleadoStatus,
} from "../lib/empleados-formatters";

type EmpleadosTableProps = {
  empleados: EmpleadoListItem[];
  isLoading: boolean;
  showTenantColumn: boolean;
  onEdit: (empleadoId: string) => void;
  onView: (empleadoId: string) => void;
};

export function EmpleadosTable({
  empleados,
  isLoading,
  onEdit,
  onView,
  showTenantColumn,
}: EmpleadosTableProps) {
  const columnCount = showTenantColumn ? 8 : 7;

  return (
    <section className="empleados-table-wrap" aria-label="Usuarios registrados">
      <table className="empleados-table">
        <thead>
          <tr>
            {showTenantColumn ? <th scope="col">Centro</th> : null}
            <th scope="col">Documento</th>
            <th scope="col">Nombre completo</th>
            <th scope="col">Email</th>
            <th scope="col">Telefono</th>
            <th scope="col">Tipo de usuario</th>
            <th scope="col">Estado</th>
            <th scope="col">
              <span className="visually-hidden">Acciones</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr>
              <td colSpan={columnCount}>Cargando usuarios...</td>
            </tr>
          ) : null}

          {!isLoading && empleados.length === 0 ? (
            <tr>
              <td colSpan={columnCount}>Sin usuarios registrados.</td>
            </tr>
          ) : null}

          {empleados.map((empleado) => (
            <tr key={empleado.id}>
              {showTenantColumn ? <td>{empleado.tenantName ?? "BackOffice"}</td> : null}
              <td>{formatEmpleadoDocument(empleado.documentNumber)}</td>
              <td>
                <strong>{empleado.fullName}</strong>
              </td>
              <td>{empleado.email}</td>
              <td>{formatEmpleadoPhone(empleado.phone)}</td>
              <td>{formatEmpleadoRole(empleado.role)}</td>
              <td>
                <span
                  className="empleado-status-badge"
                  data-state={empleado.isActive ? "active" : "inactive"}
                >
                  {formatEmpleadoStatus(empleado.isActive)}
                </span>
              </td>
              <td>
                <div className="empleados-row-actions">
                  <button
                    className="empleados-row-action"
                    type="button"
                    aria-label={`Ver ${empleado.fullName}`}
                    title="Ver"
                    onClick={() => onView(empleado.id)}
                  >
                    <Eye aria-hidden="true" />
                  </button>
                  <button
                    className="empleados-row-action"
                    type="button"
                    aria-label={`Editar ${empleado.fullName}`}
                    title="Editar"
                    onClick={() => onEdit(empleado.id)}
                  >
                    <Pencil aria-hidden="true" />
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
