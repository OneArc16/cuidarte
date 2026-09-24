import { type ActividadGrupalListItem } from "@cuidarte/contracts";
import { FileText, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatActaNumber } from "../lib/actividades-grupales-formatters";

type ActividadGrupalDeleteDialogProps = {
  actividad: ActividadGrupalListItem;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function ActividadGrupalDeleteDialog({
  actividad,
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: ActividadGrupalDeleteDialogProps) {
  const [reason, setReason] = useState("");

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
            <p className="actividad-delete-dialog__eyebrow">Acción sensible</p>
            <h2 id="actividad-delete-dialog-title">Eliminar acta</h2>
          </div>
          <button
            className="actividades-row-action actividad-delete-dialog__close-button"
            type="button"
            aria-label="Cerrar confirmación de eliminación"
            data-tooltip="Cerrar"
            disabled={isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <p className="actividad-delete-dialog__message">
          El acta saldrá del listado activo y solo quedará disponible en el log de eliminaciones.
        </p>

        <div className="actividad-delete-dialog__hero">
          <span className="actividad-delete-dialog__icon" aria-hidden="true">
            <FileText />
          </span>
          <div>
            <strong>{actividad.activityName}</strong>
            <span>
              Acta <b>{formatActaNumber(actividad.actaNumber)}</b>
            </span>
          </div>
        </div>

        <label className="actividad-delete-dialog__reason">
          <span>
            Motivo de la eliminación <em>Obligatorio</em>
          </span>
          <textarea
            aria-label="Motivo"
            value={reason}
            maxLength={250}
            disabled={isPending}
            placeholder="Escribe el motivo de la eliminación"
            onChange={(event) => setReason(event.target.value)}
          />
          <small>{reason.length}/250</small>
        </label>

        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className="actividad-delete-dialog__actions">
          <button
            className="secondary-action actividad-delete-dialog__action-button actividad-delete-dialog__action-button--cancel"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-action actividad-delete-dialog__action-button actividad-delete-dialog__action-button--danger"
            type="button"
            disabled={isPending || reason.trim() === ""}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="actividad-delete-dialog__spinner" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 aria-hidden="true" />
                Eliminar acta
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
