import { type EmpleadoDetail } from "@cuidarte/contracts";
import { History } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { resolveEmpleadosApiError } from "../lib/empleados-formatters";
import {
  useAssignEmpleadoDirectorSignatureMutation,
  useEmpleadoSignaturePreviewQuery,
  useUploadEmpleadoSignatureMutation,
} from "../model/empleados-queries";

type EmpleadoDirectorSignaturePanelProps = {
  detail: EmpleadoDetail;
};

export function EmpleadoDirectorSignaturePanel({
  detail,
}: EmpleadoDirectorSignaturePanelProps) {
  const uploadMutation = useUploadEmpleadoSignatureMutation(detail.id);
  const assignMutation = useAssignEmpleadoDirectorSignatureMutation(detail.id);
  const signaturePreviewQuery = useEmpleadoSignaturePreviewQuery(
    detail.id,
    detail.latestSignature !== null,
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(resolveTodayDate());
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setStatusMessage(null);
  }, [detail.id]);

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

  if (detail.role !== "director" || detail.tenantId === null) {
    return null;
  }

  return (
    <section
      className="empleado-signature-panel"
      aria-labelledby="empleado-director-signature-title"
    >
      <div className="empleado-signature-panel__header">
        <div>
          <p className="empleado-signature-panel__eyebrow">Firma del director</p>
          <h2 id="empleado-director-signature-title">Firma vigente del centro</h2>
        </div>

        {statusMessage !== null ? (
          <p className="success-banner" role="status">
            {statusMessage}
          </p>
        ) : null}
      </div>

      <div className="empleado-signature-panel__summary">
        <article className="empleado-signature-card">
          <strong>Firma cargada</strong>
          <p>
            {hasCurrentSignature
              ? "La ultima firma cargada es la que puedes usar para nuevas vigencias."
              : "Este director aun no tiene una firma cargada."}
          </p>

          {previewUrl !== null ? (
            <div className="empleado-signature-preview">
              <img src={previewUrl} alt={`Firma cargada de ${detail.fullName}`} />
            </div>
          ) : (
            <div className="empleado-signature-preview empleado-signature-preview--empty">
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

        <article className="empleado-signature-card">
          <strong>Asignacion vigente</strong>
          {detail.currentDirectorSignatureAssignment === null ? (
            <p>Este centro todavia no tiene una vigencia de firma activa para este director.</p>
          ) : (
            <dl className="empleado-signature-meta">
              <div>
                <dt>Inicio</dt>
                <dd>{detail.currentDirectorSignatureAssignment.effectiveFrom}</dd>
              </div>
              <div>
                <dt>Fin</dt>
                <dd>{detail.currentDirectorSignatureAssignment.effectiveTo ?? "Vigente"}</dd>
              </div>
            </dl>
          )}

          <p className="empleado-signature-card__note">
            Cuando cambie el director, crea una nueva vigencia. Los formatos ya emitidos seguiran
            usando la firma historica congelada.
          </p>
        </article>
      </div>

      <details className="empleado-signature-history">
        <summary>
          <span className="empleado-signature-history__icon" aria-hidden="true">
            <History />
          </span>
          <span className="empleado-signature-history__heading">
            <strong>Historial de vigencias</strong>
            <small>Consulta los directores y firmas asignados anteriormente al centro.</small>
          </span>
          <span className="empleado-signature-history__count">
            {detail.directorSignatureAssignmentHistory.length}
          </span>
        </summary>

        {detail.directorSignatureAssignmentHistory.length === 0 ? (
          <p className="empleado-signature-history__empty">
            Aun no existen vigencias de firma registradas para este centro.
          </p>
        ) : (
          <ol className="empleado-signature-timeline">
            {detail.directorSignatureAssignmentHistory.map((assignment) => {
              const isCurrent = assignment.effectiveTo === null;

              return (
                <li key={assignment.id}>
                  <span
                    className="empleado-signature-timeline__marker"
                    data-state={isCurrent ? "current" : "closed"}
                    aria-hidden="true"
                  />
                  <div className="empleado-signature-timeline__content">
                    <div className="empleado-signature-timeline__identity">
                      <div>
                        <strong>{assignment.employeeFullName}</strong>
                        <span>{assignment.signatureOriginalName}</span>
                      </div>
                      <span
                        className="empleado-signature-timeline__status"
                        data-state={isCurrent ? "current" : "closed"}
                      >
                        {isCurrent ? "Vigente" : "Finalizada"}
                      </span>
                    </div>
                    <dl>
                      <div>
                        <dt>Desde</dt>
                        <dd>{formatAssignmentDate(assignment.effectiveFrom)}</dd>
                      </div>
                      <div>
                        <dt>Hasta</dt>
                        <dd>
                          {assignment.effectiveTo === null
                            ? "Actualidad"
                            : formatAssignmentDate(assignment.effectiveTo)}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </details>

      <div className="empleado-signature-panel__actions">
        <form
          className="empleado-signature-action-card"
          onSubmit={(event) => {
            event.preventDefault();

            if (selectedFile === null) {
              return;
            }

            setStatusMessage(null);
            uploadMutation.mutate(selectedFile, {
              onSuccess: () => {
                setSelectedFile(null);
                setFileInputKey((currentKey) => currentKey + 1);
                setStatusMessage("Firma cargada correctamente.");
              },
            });
          }}
        >
          <div>
            <strong>Cargar nueva firma</strong>
            <p>Acepta archivos `png`, `jpg`, `jpeg` y `webp` de hasta 3 MB.</p>
          </div>

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

          <p className="empleado-signature-file-name">
            {selectedFile?.name ?? "Ningun archivo seleccionado."}
          </p>

          {uploadMutation.isError ? (
            <p className="form-error" role="alert">
              {resolveEmpleadosApiError(uploadMutation.error)}
            </p>
          ) : null}

          <button
            className="primary-action"
            type="submit"
            disabled={selectedFile === null || uploadMutation.isPending}
          >
            {uploadMutation.isPending ? "Cargando..." : "Subir firma"}
          </button>
        </form>

        <form
          className="empleado-signature-action-card"
          onSubmit={(event) => {
            event.preventDefault();
            setStatusMessage(null);
            assignMutation.mutate(
              {
                effectiveFrom,
                signatureVersionId: detail.latestSignature?.id ?? null,
              },
              {
                onSuccess: () => {
                  setStatusMessage("Vigencia del director actualizada.");
                },
              },
            );
          }}
        >
          <div>
            <strong>Asignar como firmante vigente</strong>
            <p>Esta accion cierra la vigencia anterior del centro y abre una nueva.</p>
          </div>

          <label className="empleado-signature-date-field">
            <span>Fecha de inicio</span>
            <input
              type="date"
              value={effectiveFrom}
              onChange={(event) => setEffectiveFrom(event.target.value)}
            />
          </label>

          {!hasCurrentSignature ? (
            <p className="empleado-signature-card__note">
              Primero debes cargar una firma para poder asignar la vigencia.
            </p>
          ) : null}

          {assignMutation.isError ? (
            <p className="form-error" role="alert">
              {resolveEmpleadosApiError(assignMutation.error)}
            </p>
          ) : null}

          <button
            className="primary-action"
            type="submit"
            disabled={!hasCurrentSignature || assignMutation.isPending}
          >
            {assignMutation.isPending ? "Actualizando..." : "Asignar vigencia"}
          </button>
        </form>
      </div>
    </section>
  );
}

function resolveTodayDate(): string {
  const now = new Date();
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);

  return localDate.toISOString().slice(0, 10);
}

function formatAssignmentDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}
