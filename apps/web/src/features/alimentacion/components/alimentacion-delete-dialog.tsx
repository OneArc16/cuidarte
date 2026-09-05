import { type AlimentacionListItem } from "@cuidarte/contracts";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect } from "react";

type AlimentacionDeleteDialogProps = {
  record: AlimentacionListItem;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AlimentacionDeleteDialog({
  record,
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: AlimentacionDeleteDialogProps) {
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
      className="alimentacion-delete-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="alimentacion-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alimentacion-delete-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="alimentacion-delete-dialog__header">
          <div>
            <p className="alimentacion-delete-dialog__eyebrow">Acción sensible</p>
            <h2 id="alimentacion-delete-dialog-title">Eliminar alimentación</h2>
          </div>
          <button
            className="alimentacion-row-action alimentacion-delete-dialog__close-button"
            type="button"
            aria-label="Cerrar confirmación de eliminación"
            title="Cerrar"
            disabled={isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="alimentacion-delete-dialog__hero">
          <span className="alimentacion-delete-dialog__icon" aria-hidden="true">
            <AlertTriangle />
          </span>
          <div>
            <strong>{record.fullName}</strong>
            <span>{record.deliveryDate}</span>
          </div>
        </div>

        <p className="alimentacion-delete-dialog__message">
          Vas a eliminar este registro diario de alimentación. Los PDFs importados del
          beneficiario se conservan y la acción queda auditada.
        </p>

        <dl className="alimentacion-delete-dialog__meta">
          <div>
            <dt>Beneficiario</dt>
            <dd>{record.fullName}</dd>
          </div>
          <div>
            <dt>Fecha</dt>
            <dd>{record.deliveryDate}</dd>
          </div>
        </dl>

        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className="alimentacion-delete-dialog__actions">
          <button
            className="secondary-action alimentacion-delete-dialog__action-button"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-action alimentacion-delete-dialog__action-button alimentacion-delete-dialog__action-button--danger"
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="alimentacion-delete-dialog__spinner" />
                Eliminando...
              </>
            ) : (
              <>
                <Trash2 aria-hidden="true" />
                Eliminar registro
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}
