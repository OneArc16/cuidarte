import { type EmpleadoDetail } from "@cuidarte/contracts";
import { Power } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { resolveTenantActiveSignerAction } from "../lib/empleados-active-signer";
import { resolveEmpleadosApiError } from "../lib/empleados-formatters";
import {
  useClearTenantActiveSignerMutation,
  useEmpleadoSignaturePreviewQuery,
  useSetTenantActiveSignerMutation,
  useUploadEmpleadoSignatureMutation,
} from "../model/empleados-queries";

type EmpleadoDirectorSignaturePanelProps = {
  detail: EmpleadoDetail;
};

type EmpleadoDirectorSignerToggleProps = {
  detail: EmpleadoDetail;
};

export function EmpleadoDirectorSignerToggle({ detail }: EmpleadoDirectorSignerToggleProps) {
  if (detail.role !== "director" || detail.tenantId === null) {
    return null;
  }

  const setSignerMutation = useSetTenantActiveSignerMutation(detail.tenantId ?? "");
  const clearSignerMutation = useClearTenantActiveSignerMutation(detail.tenantId ?? "");

  const latestSignatureId = detail.latestSignature?.id ?? null;
  const signerAction = resolveTenantActiveSignerAction({
    activeSigner: detail.tenantActiveSigner,
    employeeId: detail.id,
    latestSignatureId,
  });
  const isActiveSigner = signerAction === "deactivate" || signerAction === "update";
  const toggleButtonLabel =
    signerAction === "deactivate"
      ? "Desactivar firmante"
      : signerAction === "update"
        ? "Actualizar firma activa"
        : "Activar firmante";
  const isToggleDisabled =
    setSignerMutation.isPending || clearSignerMutation.isPending || signerAction === "unavailable";

  return (
    <button
      className="empleado-status-toggle empleado-signature-status-toggle"
      type="button"
      aria-pressed={isActiveSigner}
      aria-label={toggleButtonLabel}
      disabled={isToggleDisabled}
      onClick={() => {
        if (signerAction === "deactivate") {
          clearSignerMutation.mutate(undefined, {
            onSuccess: () => {
              toast.success("Firmante activo desactivado.");
            },
          });

          return;
        }

        if (detail.latestSignature === null) {
          return;
        }

        setSignerMutation.mutate(
          {
            employeeId: detail.id,
            signatureVersionId: detail.latestSignature.id,
          },
          {
            onSuccess: () => {
              toast.success("Firmante activo del centro actualizado.");
            },
          },
        );
      }}
    >
      <span className="empleado-status-toggle__icon" aria-hidden="true">
        <Power />
      </span>
      <span>
        <strong>{isActiveSigner ? "Firmante activo" : "Firmante inactivo"}</strong>
        <small>
          {signerAction === "deactivate"
            ? "Desactivar firmante"
            : signerAction === "update"
              ? "Actualizar firma activa"
              : signerAction === "activate"
                ? "Activar firmante"
                : "Cargar firma primero"}
        </small>
      </span>
    </button>
  );
}

export function EmpleadoDirectorSignaturePanel({ detail }: EmpleadoDirectorSignaturePanelProps) {
  const isDirectorWithTenant = detail.role === "director" && detail.tenantId !== null;

  const uploadMutation = useUploadEmpleadoSignatureMutation(detail.id);
  const signaturePreviewQuery = useEmpleadoSignaturePreviewQuery(
    detail.id,
    detail.latestSignature !== null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (signaturePreviewQuery.data === undefined) {
      setPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(signaturePreviewQuery.data);
    setPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [signaturePreviewQuery.data]);

  const hasCurrentSignature = detail.latestSignature !== null;
  const currentSignatureCreatedAtLabel = useMemo(() => {
    if (detail.latestSignature === null) {
      return null;
    }

    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(detail.latestSignature.createdAt));
  }, [detail.latestSignature]);

  if (detail.tenantId === null) {
    return null;
  }

  return (
    <section
      className="empleado-signature-panel"
      aria-labelledby="empleado-director-signature-title"
    >
      <div className="empleado-signature-panel__header">
        <div>
          <p className="empleado-signature-panel__eyebrow">
            {isDirectorWithTenant ? "Firma del director" : "Firma del usuario"}
          </p>
          <h2 id="empleado-director-signature-title">
            {isDirectorWithTenant ? "Firma y firmante activo" : "Firma opcional"}
          </h2>
        </div>
      </div>

      <div className="empleado-signature-panel__summary">
        <article className="empleado-signature-card empleado-signature-card--preview">
          <strong>Firma actual cargada</strong>
          <p>
            {hasCurrentSignature
              ? isDirectorWithTenant
                ? "La ultima firma cargada puede activarse para el centro."
                : "La firma queda disponible para los formatos o actas que la requieran."
              : isDirectorWithTenant
                ? "Este director aun no tiene una firma cargada."
                : "Este usuario aun no tiene una firma cargada."}
          </p>

          {previewUrl !== null ? (
            <div className="empleado-signature-preview empleado-signature-preview--compact">
              <img src={previewUrl} alt={`Firma cargada de ${detail.fullName}`} />
            </div>
          ) : (
            <div className="empleado-signature-preview empleado-signature-preview--empty empleado-signature-preview--compact">
              <span>Sin vista previa</span>
            </div>
          )}

          {currentSignatureCreatedAtLabel !== null ? (
            <dl className="empleado-signature-meta">
              <div>
                <dt>Archivo</dt>
                <dd>{detail.latestSignature?.originalName}</dd>
              </div>
              <div>
                <dt>Subida</dt>
                <dd>{currentSignatureCreatedAtLabel}</dd>
              </div>
            </dl>
          ) : null}

          {signaturePreviewQuery.isError ? (
            <p className="form-error" role="alert">
              {resolveEmpleadosApiError(signaturePreviewQuery.error)}
            </p>
          ) : null}
        </article>

        <form
          className="empleado-signature-action-card empleado-signature-action-card--compact"
          onSubmit={(event) => {
            event.preventDefault();

            if (selectedFile === null) {
              return;
            }

            uploadMutation.mutate(selectedFile, {
              onSuccess: () => {
                setSelectedFile(null);
                setFileInputKey((currentKey) => currentKey + 1);
                toast.success("Firma cargada correctamente.");
              },
            });
          }}
        >
          <div className="empleado-signature-upload-copy">
            <strong>Cargar nueva firma</strong>
            <p>
              PNG, JPG, JPEG, WEBP (max 3 MB).
              {isDirectorWithTenant
                ? " Si corresponde, luego podras activarla como firmante del centro."
                : " Este paso es opcional."}
            </p>
          </div>

          <div className="empleado-signature-upload-row">
            <label className="empleado-signature-file-input">
              <span>Seleccionar archivo</span>
              <input
                key={fileInputKey}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
                onChange={(event) => {
                  setSelectedFile(event.target.files?.[0] ?? null);
                }}
              />
            </label>

            <button
              className="primary-action empleado-signature-upload-button"
              type="submit"
              disabled={selectedFile === null || uploadMutation.isPending}
            >
              {uploadMutation.isPending ? "..." : "Subir"}
            </button>
          </div>

          <div className="empleado-signature-upload-footer">
            <p className="empleado-signature-file-name">
              {selectedFile?.name ?? "Ningún archivo seleccionado."}
            </p>

            {uploadMutation.isError ? (
              <p className="form-error" role="alert">
                {resolveEmpleadosApiError(uploadMutation.error)}
              </p>
            ) : null}
          </div>
        </form>
      </div>
    </section>
  );
}
