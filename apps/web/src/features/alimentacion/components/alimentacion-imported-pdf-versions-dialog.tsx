import { type AlimentacionImportedFormatoVersion } from "@cuidarte/contracts";
import { Download, LoaderCircle, X } from "lucide-react";
import { useEffect } from "react";

type AlimentacionImportedPdfVersionsDialogProps = {
  fullName: string;
  versions: AlimentacionImportedFormatoVersion[];
  isLoading: boolean;
  errorMessage: string | null;
  downloadingVersionId: string | null;
  onClose: () => void;
  onDownload: (version: AlimentacionImportedFormatoVersion) => void;
};

export function AlimentacionImportedPdfVersionsDialog({
  fullName,
  versions,
  isLoading,
  errorMessage,
  downloadingVersionId,
  onClose,
  onDownload,
}: AlimentacionImportedPdfVersionsDialogProps) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="alimentacion-import-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="alimentacion-import-dialog alimentacion-import-dialog--versions"
        role="dialog"
        aria-modal="true"
        aria-labelledby="alimentacion-imported-versions-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="alimentacion-import-dialog__header">
          <div>
            <p className="alimentacion-import-dialog__eyebrow">Formatos diligenciados</p>
            <h2 id="alimentacion-imported-versions-title">Versiones importadas</h2>
            <p>{fullName}</p>
          </div>
          <button
            className="alimentacion-row-action"
            type="button"
            aria-label="Cerrar historial de versiones"
            title="Cerrar"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {isLoading ? (
          <p className="alimentacion-import-dialog__loading">Cargando versiones...</p>
        ) : null}
        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        {!isLoading && errorMessage === null && versions.length === 0 ? (
          <p className="alimentacion-import-dialog__note">
            Aun no hay PDFs importados para este mes.
          </p>
        ) : null}
        {!isLoading && errorMessage === null && versions.length > 0 ? (
          <ol className="alimentacion-imported-versions-list">
            {versions.map((version) => {
              const isDownloading = downloadingVersionId === version.id;

              return (
                <li key={version.id}>
                  <div>
                    <strong>Version {version.version}</strong>
                    <span>{version.originalName}</span>
                    <small>
                      {formatImportedDate(version.importedAt)} · {formatFileSize(version.sizeBytes)}{" "}
                      · {version.importedByUserFullName}
                    </small>
                  </div>
                  <button
                    className="alimentacion-row-action alimentacion-row-action--imported"
                    type="button"
                    aria-label={`Descargar version ${version.version}`}
                    title={`Descargar version ${version.version}`}
                    disabled={isDownloading}
                    onClick={() => onDownload(version)}
                  >
                    {isDownloading ? (
                      <LoaderCircle aria-hidden="true" className="alimentacion-spin" />
                    ) : (
                      <Download aria-hidden="true" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        ) : null}
      </section>
    </div>
  );
}

function formatImportedDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024 * 1024) {
    return `${Math.max(1, Math.ceil(sizeBytes / 1024))} KB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
}
