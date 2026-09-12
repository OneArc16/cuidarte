import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect } from "react";

type AtencionEnfermeriaDeleteDialogProps = {
  isPending: boolean;
  onClose: () => void;
  onConfirm: () => void;
};

export function AtencionEnfermeriaDeleteDialog({
  isPending,
  onClose,
  onConfirm,
}: AtencionEnfermeriaDeleteDialogProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      className="atencion-delete-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) onClose();
      }}
    >
      <section
        className="atencion-delete-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="atencion-delete-dialog-title"
        aria-describedby="atencion-delete-dialog-message"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="atencion-delete-dialog__header">
          <div>
            <p className="atencion-delete-dialog__eyebrow">Acción sensible</p>
            <h2 id="atencion-delete-dialog-title">Enviar a la papelera</h2>
          </div>
          <button
            className="atencion-delete-dialog__close-button"
            type="button"
            aria-label="Cerrar confirmación"
            title="Cerrar"
            disabled={isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="atencion-delete-dialog__hero" aria-hidden="true">
          <span className="atencion-delete-dialog__icon">
            <AlertTriangle />
          </span>
          <div>
            <strong>¿Enviar esta atención a la papelera?</strong>
          </div>
        </div>

        <p className="atencion-delete-dialog__message" id="atencion-delete-dialog-message">
          La atención dejará de aparecer en el historial activo, pero sus datos se conservarán.
        </p>

        <footer className="atencion-delete-dialog__actions">
          <button
            className="secondary-action atencion-delete-dialog__action-button"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-action atencion-delete-dialog__action-button atencion-delete-dialog__action-button--danger"
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="atencion-delete-dialog__spinner" />
                Enviando...
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
