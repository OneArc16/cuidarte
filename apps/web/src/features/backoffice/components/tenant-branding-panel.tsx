import { type TenantLogoMetadata } from "@cuidarte/contracts";
import { ImagePlus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { resolveApiError } from "../lib/backoffice-formatters";
import {
  useRemoveTenantLogoMutation,
  useTenantLogoPreviewQuery,
  useUploadTenantLogoMutation,
} from "../model/tenant-branding-queries";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

type TenantBrandingPanelProps = {
  tenantId: string;
  tenantName: string;
  logo: TenantLogoMetadata | null;
};

export function TenantBrandingPanel({ tenantId, tenantName, logo }: TenantBrandingPanelProps) {
  const previewQuery = useTenantLogoPreviewQuery(tenantId, logo?.versionId ?? null);
  const uploadMutation = useUploadTenantLogoMutation(tenantId);
  const removeMutation = useRemoveTenantLogoMutation(tenantId);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [storedPreviewUrl, setStoredPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);

  useEffect(() => {
    if (previewQuery.data === undefined) {
      setStoredPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(previewQuery.data);
    setStoredPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [previewQuery.data]);

  useEffect(() => {
    if (selectedFile === null) {
      setSelectedPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedPreviewUrl(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [selectedFile]);

  const updatedAtLabel = useMemo(() => {
    if (logo === null) {
      return null;
    }

    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(logo.updatedAt));
  }, [logo]);

  const previewUrl = selectedPreviewUrl ?? storedPreviewUrl;
  const isBusy = uploadMutation.isPending || removeMutation.isPending;
  const mutationError = resolveApiError(uploadMutation.error ?? removeMutation.error);

  return (
    <section className="tenant-branding-panel" aria-labelledby="tenant-branding-title">
      <div className="tenant-branding-panel__header">
        <div>
          <p className="eyebrow">Identidad visual</p>
          <h2 id="tenant-branding-title">Logo del Centro de Vida</h2>
        </div>
        <span
          className={`tenant-branding-status${logo === null ? " tenant-branding-status--pending" : ""}`}
        >
          {logo === null ? "Logo pendiente" : "Logo configurado"}
        </span>
      </div>

      <div className="tenant-branding-panel__body">
        <div
          className={`tenant-branding-preview${previewUrl === null ? " tenant-branding-preview--empty" : ""}`}
          aria-busy={logo !== null && previewQuery.isLoading}
        >
          {previewUrl === null ? (
            <div className="tenant-branding-preview__placeholder">
              <ShieldAlert aria-hidden="true" />
              <strong>Sin logo activo</strong>
              <span>No se podrán emitir formatos nuevos hasta cargarlo.</span>
            </div>
          ) : (
            <img src={previewUrl} alt={`Logo de ${tenantName}`} />
          )}
        </div>

        <div className="tenant-branding-panel__content">
          {logo === null ? (
            <p className="tenant-branding-panel__warning">
              El centro puede seguir administrándose, pero la exportación de nuevos formatos de
              alimentación permanecerá bloqueada.
            </p>
          ) : (
            <dl className="tenant-branding-meta">
              <div>
                <dt>Archivo original</dt>
                <dd>{logo.originalName}</dd>
              </div>
              <div>
                <dt>Actualizado</dt>
                <dd>{updatedAtLabel}</dd>
              </div>
            </dl>
          )}

          <form
            className="tenant-branding-upload"
            onSubmit={(event) => {
              event.preventDefault();

              if (selectedFile === null) {
                setValidationError("Selecciona una imagen antes de continuar.");
                return;
              }

              uploadMutation.mutate(selectedFile, {
                onSuccess: () => {
                  setSelectedFile(null);
                  setValidationError(null);
                  setFileInputKey((current) => current + 1);
                  toast.success(
                    logo === null
                      ? "Logo cargado correctamente."
                      : "Logo reemplazado correctamente.",
                  );
                },
              });
            }}
          >
            <label className="tenant-branding-file-field" htmlFor="tenant-logo-file">
              <span>{logo === null ? "Seleccionar logo" : "Seleccionar reemplazo"}</span>
              <input
                key={fileInputKey}
                id="tenant-logo-file"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                aria-describedby="tenant-logo-help tenant-logo-error"
                aria-invalid={validationError !== null}
                disabled={isBusy}
              onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  const error = validateSelectedFile(file);

                  setValidationError(error);
                  setSelectedFile(error === null ? file : null);
                }}
              />
            </label>
            <p id="tenant-logo-help" className="tenant-branding-help">
              PNG, JPEG o WebP · máximo 2 MB · recomendado con fondo transparente.
            </p>
            <p className="tenant-branding-file-name">
              {selectedFile?.name ?? "Ningún archivo seleccionado."}
            </p>

            {validationError !== null ? (
              <p id="tenant-logo-error" className="form-error" role="alert">
                {validationError}
              </p>
            ) : null}
            {mutationError !== null ? (
              <p className="form-error" role="alert">
                {mutationError}
              </p>
            ) : null}
            {previewQuery.isError && logo !== null ? (
              <p className="form-error" role="alert">
                No fue posible cargar la vista previa. Puedes intentar reemplazar el logo.
              </p>
            ) : null}

            <div className="tenant-branding-actions">
              <button
                className="primary-action"
                type="submit"
                disabled={selectedFile === null || isBusy}
              >
                {logo === null ? (
                  <ImagePlus aria-hidden="true" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                <span>
                  {uploadMutation.isPending
                    ? "Subiendo..."
                    : logo === null
                      ? "Subir logo"
                      : "Reemplazar logo"}
                </span>
              </button>

              {logo !== null ? (
                <button
                  className="outline-action tenant-branding-remove"
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    const confirmed = window.confirm(
                      "Retirar el logo bloqueará la emisión de nuevos formatos de alimentación. Los PDF históricos no cambiarán. ¿Deseas continuar?",
                    );

                    if (!confirmed) {
                      return;
                    }

                    removeMutation.mutate(undefined, {
                      onSuccess: () => {
                        setSelectedFile(null);
                        setValidationError(null);
                        setFileInputKey((current) => current + 1);
                        toast.success("Logo retirado. Las emisiones históricas se conservaron.");
                      },
                    });
                  }}
                >
                  <Trash2 aria-hidden="true" />
                  <span>{removeMutation.isPending ? "Retirando..." : "Retirar logo"}</span>
                </button>
              ) : null}
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}

function validateSelectedFile(file: File | null): string | null {
  if (file === null) {
    return null;
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return "Selecciona una imagen PNG, JPEG o WebP.";
  }

  if (file.size === 0) {
    return "La imagen seleccionada está vacía.";
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return "La imagen no puede superar 2 MB.";
  }

  return null;
}
