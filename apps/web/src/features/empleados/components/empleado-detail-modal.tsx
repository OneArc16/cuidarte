import { X } from "lucide-react";
import { useEffect } from "react";

import {
  formatEmpleadoDocument,
  formatEmpleadoPhone,
  formatEmpleadoRole,
  formatEmpleadoStatus,
  resolveEmpleadosApiError,
} from "../lib/empleados-formatters";
import { useEmpleadoQuery } from "../model/empleados-queries";

type EmpleadoDetailModalProps = {
  empleadoId: string;
  showTenant: boolean;
  onClose: () => void;
};

export function EmpleadoDetailModal({
  empleadoId,
  onClose,
  showTenant,
}: EmpleadoDetailModalProps) {
  const empleadoQuery = useEmpleadoQuery(empleadoId);
  const detail = empleadoQuery.data ?? null;

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="empleado-modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="empleado-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="empleado-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="empleado-modal__header">
          <div>
            <p className="eyebrow">Usuario</p>
            <h2 id="empleado-modal-title">{detail?.fullName ?? "Detalle de usuario"}</h2>
          </div>
          <button
            className="empleados-row-action"
            type="button"
            aria-label="Cerrar detalle"
            data-tooltip="Cerrar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {empleadoQuery.isLoading ? (
          <p className="empleado-modal__status" aria-busy="true">
            Cargando usuario...
          </p>
        ) : null}

        {empleadoQuery.isError ? (
          <p className="form-error" role="alert">
            {resolveEmpleadosApiError(empleadoQuery.error)}
          </p>
        ) : null}

        {detail !== null ? (
          <dl className="empleado-detail-grid">
            {showTenant ? (
              <div>
                <dt>Centro</dt>
                <dd>{detail.tenantName ?? "BackOffice"}</dd>
              </div>
            ) : null}
            <div>
              <dt>Documento</dt>
              <dd>{formatEmpleadoDocument(detail.documentNumber)}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{detail.email}</dd>
            </div>
            <div>
              <dt>Telefono</dt>
              <dd>{formatEmpleadoPhone(detail.phone)}</dd>
            </div>
            <div>
              <dt>Tipo de usuario</dt>
              <dd>{formatEmpleadoRole(detail.role)}</dd>
            </div>
            <div>
              <dt>Estado</dt>
              <dd>{formatEmpleadoStatus(detail.isActive)}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </div>
  );
}
