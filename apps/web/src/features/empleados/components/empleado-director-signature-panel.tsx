import { type EmpleadoDetail } from "@cuidarte/contracts";
import { ImagePlus, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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

const MAX_SIGNATURE_FILE_SIZE_BYTES = 3 * 1024 * 1024;
const ACCEPTED_SIGNATURE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);
const SIGNATURE_FILE_ACCEPT = ".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp";

export function canShowEmpleadoSignature(detail: EmpleadoDetail) {
  return detail.tenantId !== null;
}

export function canShowEmpleadoDirectorSignature(detail: EmpleadoDetail) {
  return detail.role === "director" && canShowEmpleadoSignature(detail);
}

export function EmpleadoDirectorSignerToggle({ detail }: EmpleadoDirectorSignerToggleProps) {
  const tenantId = detail.tenantId ?? "";
  const setSignerMutation = useSetTenantActiveSignerMutation(tenantId);
  const clearSignerMutation = useClearTenantActiveSignerMutation(tenantId);
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

  if (!canShowEmpleadoDirectorSignature(detail)) {
    return null;
  }

  return (
    <div className="empleado-signature-signer">
      <div>
        <strong>Firmante activo</strong>
        <span>Firma los documentos del centro</span>
      </div>
      <button
        className="empleado-switch"
        type="button"
        role="switch"
        aria-checked={isActiveSigner}
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
        <span aria-hidden="true" />
      </button>
    </div>
  );
}

export function EmpleadoDirectorSignaturePanel({ detail }: EmpleadoDirectorSignaturePanelProps) {
  const canShowSignature = canShowEmpleadoSignature(detail);
  const isDirectorWithTenant = canShowEmpleadoDirectorSignature(detail);
  const uploadMutation = useUploadEmpleadoSignatureMutation(detail.id);
  const signaturePreviewQuery = useEmpleadoSignaturePreviewQuery(
    detail.id,
    canShowSignature && detail.latestSignature !== null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedPreviewUrl, setSelectedPreviewUrl] = useState<string | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

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

  useEffect(() => {
    if (selectedFile === null) {
      setSelectedPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(selectedFile);
    setSelectedPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [selectedFile]);

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

  if (!canShowSignature) {
    return null;
  }

  const displayedPreviewUrl = selectedPreviewUrl ?? previewUrl;
  const displayedFileName = selectedFile?.name ?? detail.latestSignature?.originalName ?? null;
  const displayedUploadDate =
    selectedFile === null ? currentSignatureCreatedAtLabel : "Pendiente de carga";

  function resetSelectedFile() {
    setSelectedFile(null);
    setSelectionError(null);
    setFileInputKey((currentKey) => currentKey + 1);
  }

  function selectFile(file: File | null) {
    if (file === null) {
      return;
    }

    if (!ACCEPTED_SIGNATURE_TYPES.has(file.type)) {
      setSelectedFile(null);
      setSelectionError("Adjunta la firma en formato PNG, JPG, JPEG o WEBP.");
      setFileInputKey((currentKey) => currentKey + 1);
      return;
    }

    if (file.size > MAX_SIGNATURE_FILE_SIZE_BYTES) {
      setSelectedFile(null);
      setSelectionError("La firma debe pesar máximo 3 MB.");
      setFileInputKey((currentKey) => currentKey + 1);
      return;
    }

    setSelectionError(null);
    setSelectedFile(file);
  }

  function openFileSelector() {
    fileInputRef.current?.click();
  }

  function uploadSelectedFile() {
    if (selectedFile === null) {
      return;
    }

    uploadMutation.mutate(selectedFile, {
      onSuccess: () => {
        resetSelectedFile();
        toast.success("Firma cargada correctamente.");
      },
    });
  }

  return (
    <aside className="empleado-signature-panel" aria-labelledby="empleado-director-signature-title">
      <div className="empleado-signature-panel__header">
        <h2 id="empleado-director-signature-title">Firma</h2>
        <span
          className="empleado-signature-status"
          data-state={hasCurrentSignature ? "loaded" : "empty"}
        >
          {hasCurrentSignature ? "Cargada" : "Sin firma"}
        </span>
      </div>

      <input
        key={fileInputKey}
        ref={fileInputRef}
        className="visually-hidden"
        type="file"
        accept={SIGNATURE_FILE_ACCEPT}
        aria-label="Seleccionar firma"
        onChange={(event) => selectFile(event.target.files?.[0] ?? null)}
      />

      <div
        className={`empleado-signature-preview${isDragOver ? " is-dragging" : ""}`}
        role="button"
        tabIndex={0}
        aria-label="Arrastra o selecciona una imagen de firma"
        onClick={openFileSelector}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openFileSelector();
          }
        }}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragOver(false);
          selectFile(event.dataTransfer.files[0] ?? null);
        }}
      >
        {displayedPreviewUrl === null ? (
          <span>
            <ImagePlus aria-hidden="true" />
            Arrastra o selecciona una imagen
          </span>
        ) : (
          <img
            src={displayedPreviewUrl}
            alt={
              selectedFile === null
                ? `Firma cargada de ${detail.fullName}`
                : "Vista previa de la firma seleccionada"
            }
          />
        )}
      </div>

      {displayedFileName !== null ? (
        <p
          className="empleado-signature-file-meta"
          title={`${displayedFileName} · ${displayedUploadDate ?? ""}`}
        >
          {displayedFileName} · {displayedUploadDate}
        </p>
      ) : null}

      <div className="empleado-signature-actions">
        <button className="outline-action" type="button" onClick={openFileSelector}>
          Reemplazar
        </button>
        {selectedFile !== null ? (
          <button
            className="empleado-signature-remove"
            type="button"
            aria-label="Quitar archivo seleccionado"
            onClick={resetSelectedFile}
          >
            <X aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {selectedFile !== null ? (
        <div className="empleado-signature-confirmation">
          <button
            className="primary-action"
            type="button"
            disabled={uploadMutation.isPending}
            onClick={uploadSelectedFile}
          >
            {uploadMutation.isPending ? "Cargando…" : "Usar esta firma"}
          </button>
          <button
            className="outline-action"
            type="button"
            disabled={uploadMutation.isPending}
            onClick={resetSelectedFile}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <p className="empleado-signature-help">PNG, JPG o WEBP · máx. 3 MB</p>

      {selectionError !== null ? (
        <p className="field-error" role="alert" aria-live="polite">
          {selectionError}
        </p>
      ) : null}

      {signaturePreviewQuery.isError ? (
        <p className="field-error" role="alert" aria-live="polite">
          {resolveEmpleadosApiError(signaturePreviewQuery.error)}
        </p>
      ) : null}

      {uploadMutation.isError ? (
        <p className="field-error" role="alert" aria-live="polite">
          {resolveEmpleadosApiError(uploadMutation.error)}
        </p>
      ) : null}

      {isDirectorWithTenant ? (
        <>
          <div className="empleado-signature-divider" />
          <EmpleadoDirectorSignerToggle detail={detail} />
        </>
      ) : null}
    </aside>
  );
}
