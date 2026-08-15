import { type ActividadGrupalListItem } from "@cuidarte/contracts";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect } from "react";

import { formatActaNumber } from "../lib/actividades-grupales-formatters";

type ActividadGrupalDeleteDialogProps = {
  actividad: ActividadGrupalListItem;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function ActividadGrupalDeleteDialog({
  actividad,
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: ActividadGrupalDeleteDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      className="actividad-delete-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="actividad-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="actividad-delete-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="actividad-delete-dialog__header">
          <div>
            <p className="actividad-delete-dialog__eyebrow">Accion sensible</p>
            <h2 id="actividad-delete-dialog-title">Enviar a la papelera</h2>
          </div>
          <button
            className="actividades-row-action actividad-delete-dialog__close-button"
            type="button"
            aria-label="Cerrar confirmacion de eliminacion"
            title="Cerrar"
            disabled={isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="actividad-delete-dialog__hero">
          <span className="actividad-delete-dialog__icon" aria-hidden="true">
            <AlertTriangle />
          </span>
          <div>
            <strong>{actividad.activityName}</strong>
            <span>Acta {formatActaNumber(actividad.actaNumber)}</span>
          </div>
        </div>

        <p className="actividad-delete-dialog__message">
          Vas a enviar esta acta a la papelera. La configuracion y los archivos se conservaran
          para una futura restauracion.
        </p>

        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className="actividad-delete-dialog__actions">
          <button
            className="secondary-action actividad-delete-dialog__action-button"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-action actividad-delete-dialog__action-button actividad-delete-dialog__action-button--danger"
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="actividad-delete-dialog__spinner" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 aria-hidden="true" />
                Enviar a la papelera
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
