import { Upload } from "lucide-react";
import { useRef } from "react";

type AdultosMayoresImportUploadProps = {
  file: File | null;
  disabled: boolean;
  onSelectFile: (file: File) => void;
  onClearFile: () => void;
};

export function AdultosMayoresImportUpload({
  disabled,
  file,
  onClearFile,
  onSelectFile,
}: AdultosMayoresImportUploadProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasFile = file !== null;

  return (
    <section className="import-upload">
      <label className="import-upload__zone">
        <div className="import-upload__copy">
          <span className="import-upload__title">Archivo .xlsx</span>
          <span className="import-upload__hint">Maximo 10 MiB / 1.000 filas.</span>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          disabled={disabled}
          onChange={(event) => {
            const selectedFile = event.target.files?.[0] ?? null;

            if (selectedFile === null) {
              return;
            }

            onSelectFile(selectedFile);
          }}
        />
        <span className="import-upload__button">
          <Upload aria-hidden="true" />
          <span>{hasFile ? "Cambiar archivo" : "Elegir archivo"}</span>
        </span>
      </label>

      {hasFile ? (
        <div className="import-upload__file">
          <div>
            <strong>{file.name}</strong>
            <p>{formatFileSize(file.size)}</p>
          </div>
          <button
            className="outline-action"
            type="button"
            disabled={disabled}
            onClick={() => {
              if (inputRef.current !== null) {
                inputRef.current.value = "";
              }

              onClearFile();
            }}
          >
            Reemplazar
          </button>
        </div>
      ) : null}
    </section>
  );
}

function formatFileSize(sizeBytes: number): string {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }

  if (sizeBytes < 1024 * 1024) {
    return `${(sizeBytes / 1024).toFixed(1)} KiB`;
  }

  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MiB`;
}
