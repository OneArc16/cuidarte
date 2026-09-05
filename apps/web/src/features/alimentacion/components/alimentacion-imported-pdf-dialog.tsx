import { FileText, LoaderCircle, Upload, X } from "lucide-react";
import { useEffect, useMemo } from "react";

type AlimentacionImportedPdfDialogProps = {
  file: File;
  fullName: string;
  deliveryMonth: string;
  hasExistingVersion: boolean;
  isPending: boolean;
  errorMessage: string | null;
  onClose: () => void;
  onConfirm: () => void;
};

export function AlimentacionImportedPdfDialog({
  file,
  fullName,
  deliveryMonth,
  hasExistingVersion,
  isPending,
  errorMessage,
  onClose,
  onConfirm,
}: AlimentacionImportedPdfDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isPending, onClose]);

  const formattedSize = useMemo(() => formatFileSize(file.size), [file.size]);

  return (
    <div
      className="alimentacion-import-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) {
          onClose();
        }
      }}
    >
      <section
        className="alimentacion-import-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alimentacion-import-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="alimentacion-import-dialog__header">
          <div>
            <p className="alimentacion-import-dialog__eyebrow">Formato diligenciado</p>
            <h2 id="alimentacion-import-dialog-title">Confirmar importacion</h2>
          </div>
          <button
            className="alimentacion-row-action alimentacion-import-dialog__close-button"
            type="button"
            aria-label="Cerrar importacion"
            title="Cerrar"
            disabled={isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="alimentacion-import-dialog__file-card">
          <span className="alimentacion-import-dialog__file-icon" aria-hidden="true">
            <FileText />
          </span>
          <div>
            <strong>{file.name}</strong>
            <span>{formattedSize}</span>
          </div>
        </div>

        <dl className="alimentacion-import-dialog__meta">
          <div>
            <dt>Beneficiario</dt>
            <dd>{fullName}</dd>
          </div>
          <div>
            <dt>Mes</dt>
            <dd>{deliveryMonth}</dd>
          </div>
        </dl>

        {hasExistingVersion ? (
          <p className="alimentacion-import-dialog__warning">
            Ya existe un PDF importado para este mes. Esta carga creara una nueva version y
            conservara todas las versiones anteriores.
          </p>
        ) : (
          <p className="alimentacion-import-dialog__note">
            El PDF quedara disponible para descarga al terminar la importacion.
          </p>
        )}

        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer className="alimentacion-import-dialog__actions">
          <button
            className="secondary-action alimentacion-import-dialog__action-button alimentacion-import-dialog__action-button--cancel"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-action alimentacion-import-dialog__action-button alimentacion-import-dialog__action-button--confirm"
            type="button"
            disabled={isPending}
            onClick={onConfirm}
          >
            {isPending ? (
              <>
                <LoaderCircle aria-hidden="true" className="alimentacion-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload aria-hidden="true" />
                Confirmar importacion
              </>
            )}
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.ceil(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
