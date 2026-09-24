import {
  type ActividadGrupalActaCorrectionPreviewResponse,
  type ActividadGrupalTipo,
  type AuthUser,
} from "@cuidarte/contracts";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  formatActividadGrupalOrganizer,
  resolveActividadesGrupalesApiError,
} from "../lib/actividades-grupales-formatters";
import { CREACION_ACTIVIDADES_PATH } from "../lib/actividades-grupales-paths";
import { useActividadGrupalTiposQuery } from "@/features/actividad-grupal-tipos/model/actividad-grupal-tipos-queries";
import {
  useActividadGrupalTenantOptionsQuery,
  useApplyActividadGrupalActaPrefixCorrectionMutation,
  usePreviewActividadGrupalActaPrefixCorrectionMutation,
} from "../model/actividades-grupales-queries";

type Props = { navigate: Navigate; user: AuthUser };
type PreviewRow = ActividadGrupalActaCorrectionPreviewResponse["rows"][number];

const activityDateFormatter = new Intl.DateTimeFormat("es-CO", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});
const activityWeekdayFormatter = new Intl.DateTimeFormat("es-CO", { weekday: "long" });

function formatActivityDate(value: string) {
  const date = new Date(value + "T12:00:00");
  return {
    date: activityDateFormatter.format(date).replace(".", ""),
    weekday: activityWeekdayFormatter.format(date),
  };
}

function resolveScheduleWarningIds(rows: readonly PreviewRow[]) {
  const warningIds = new Set<string>();

  for (let index = 0; index < rows.length; index += 1) {
    const current = rows[index];
    if (current === undefined) continue;

    for (let nextIndex = index + 1; nextIndex < rows.length; nextIndex += 1) {
      const next = rows[nextIndex];
      if (next === undefined || next.activityDate !== current.activityDate) continue;
      if (next.startTime >= current.endTime) break;

      if (current.startTime < next.endTime && next.startTime < current.endTime) {
        warningIds.add(current.activityId);
        warningIds.add(next.activityId);
      }
    }
  }

  return warningIds;
}

function formatRemainingTime(expiresAt: string, now: number) {
  const remainingSeconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - now) / 1000));
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = String(remainingSeconds % 60).padStart(2, "0");
  return minutes + ":" + seconds;
}

export function ActividadesGrupalesCorrectionsPage({ navigate, user }: Props) {
  const [tenantId, setTenantId] = useState("");
  const [activityTypeId, setActivityTypeId] = useState("");
  const [targetPrefix, setTargetPrefix] = useState("");
  const [reason, setReason] = useState("");
  const [isReasonDialogOpen, setIsReasonDialogOpen] = useState(false);
  const [preview, setPreview] = useState<ActividadGrupalActaCorrectionPreviewResponse | null>(null);
  const [previewCreatedAt, setPreviewCreatedAt] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(user.role === "super_admin");
  const previewMutation = usePreviewActividadGrupalActaPrefixCorrectionMutation();
  const applyMutation = useApplyActividadGrupalActaPrefixCorrectionMutation();
  const activityTypesQuery = useActividadGrupalTiposQuery(
    { tenantId: tenantId === "" ? null : tenantId, includeInactive: false },
    tenantId !== "",
  );
  const activityTypes = activityTypesQuery.data?.activityTypes ?? [];
  const selectedActivityType = activityTypes.find(
    (activityType) => activityType.id === activityTypeId,
  );
  const warningIds = useMemo(
    () => (preview === null ? new Set<string>() : resolveScheduleWarningIds(preview.rows)),
    [preview],
  );
  const canPreview =
    tenantId !== "" &&
    activityTypeId !== "" &&
    /^[A-Z0-9]{2,24}$/.test(targetPrefix) &&
    !previewMutation.isPending &&
    !applyMutation.isPending;
  const currentPrefix = selectedActivityType?.consecutiveConfig?.prefix ?? "Serie general";
  const selectedTenant = tenantOptionsQuery.data?.tenants.find((tenant) => tenant.id === tenantId);
  const selectedTenantName = selectedTenant?.name ?? "el centro seleccionado";
  const selectedActivityName = selectedActivityType?.name ?? "la actividad seleccionada";
  const previewTimeLabel =
    previewCreatedAt === null
      ? ""
      : new Intl.DateTimeFormat("es-CO", { hour: "2-digit", minute: "2-digit" }).format(
          previewCreatedAt,
        );

  useEffect(() => {
    if (preview === null) return;
    const intervalId = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(intervalId);
  }, [preview]);

  function loadPreview() {
    if (!canPreview) {
      toast.error("Selecciona un centro, una actividad y un prefijo válido.");
      return;
    }

    previewMutation.mutate(
      { tenantId, activityTypeId, prefix: targetPrefix },
      {
        onSuccess: (result) => {
          setPreview(result);
          setPreviewCreatedAt(Date.now());
        },
        onError: (error) =>
          toast.error(
            resolveActividadesGrupalesApiError(error) ?? "No fue posible generar la vista previa.",
          ),
      },
    );
  }

  function openReasonDialog() {
    setReason("");
    setIsReasonDialogOpen(true);
  }

  function applyNormalization() {
    if (preview === null || reason.trim() === "") return;

    applyMutation.mutate(
      { operationToken: preview.operationToken, reason: reason.trim() },
      {
        onSuccess: (result) => {
          toast.success(result.changedCount + " actas normalizadas correctamente.");
          setPreview(null);
          setPreviewCreatedAt(null);
          setIsReasonDialogOpen(false);
          setReason("");
        },
        onError: (error) =>
          toast.error(
            resolveActividadesGrupalesApiError(error) ?? "La vista previa ya no está vigente.",
          ),
      },
    );
  }

  return (
    <section className="actividades-corrections" aria-label="Normalizar consecutivos de actas">
      <div className="actividades-corrections__toolbar">
        <button
          className="actividades-corrections__back"
          type="button"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          Corrección administrativa
        </button>
      </div>

      <section
        className="actividades-corrections__filters"
        aria-label="Parámetros de normalización"
      >
        <label className="actividades-corrections__field">
          <span>Centro</span>
          <select
            value={tenantId}
            onChange={(event) => {
              setTenantId(event.target.value);
              setActivityTypeId("");
              setTargetPrefix("");
              setPreview(null);
              setPreviewCreatedAt(null);
            }}
            disabled={
              tenantOptionsQuery.isLoading || previewMutation.isPending || applyMutation.isPending
            }
          >
            <option value="">Seleccionar centro</option>
            {(tenantOptionsQuery.data?.tenants ?? []).map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>

        <label className="actividades-corrections__field">
          <span>Actividad</span>
          <select
            value={activityTypeId}
            onChange={(event) => {
              const nextActivityTypeId = event.target.value;
              setActivityTypeId(nextActivityTypeId);
              const activityType = activityTypes.find((item) => item.id === nextActivityTypeId);
              setTargetPrefix(activityType?.consecutiveConfig?.prefix ?? "");
              setPreview(null);
              setPreviewCreatedAt(null);
            }}
            disabled={
              tenantId === "" ||
              activityTypesQuery.isLoading ||
              previewMutation.isPending ||
              applyMutation.isPending
            }
          >
            <option value="">Seleccionar actividad</option>
            {activityTypes.map((activityType: ActividadGrupalTipo) => (
              <option key={activityType.id} value={activityType.id}>
                {activityType.name} · {activityType.consecutiveConfig?.prefix ?? "Serie general"}
              </option>
            ))}
          </select>
          <small>
            Prefijo actual {currentPrefix}
            {preview === null ? "" : " · " + preview.totalCount + " sesiones"}
          </small>
        </label>

        <label className="actividades-corrections__field">
          <span className="actividades-corrections__field-label">
            <span>Nuevo prefijo</span>
            <strong className={/^[A-Z0-9]{2,24}$/.test(targetPrefix) ? "is-valid" : ""}>
              {/^[A-Z0-9]{2,24}$/.test(targetPrefix) ? <CheckCircle2 aria-hidden="true" /> : null}
              {/^[A-Z0-9]{2,24}$/.test(targetPrefix) ? "Válido" : ""}
            </strong>
          </span>
          <input
            value={targetPrefix}
            maxLength={24}
            placeholder="Ej. SALUD"
            onChange={(event) => {
              setTargetPrefix(event.target.value.toUpperCase());
              setPreview(null);
              setPreviewCreatedAt(null);
            }}
            disabled={activityTypeId === "" || previewMutation.isPending || applyMutation.isPending}
            aria-invalid={targetPrefix !== "" && !/^[A-Z0-9]{2,24}$/.test(targetPrefix)}
          />
          <small>Mayúsculas y números</small>
        </label>
      </section>

      {preview !== null ? (
        <section className="actividades-corrections__preview-card" aria-live="polite">
          <header className="actividades-corrections__preview-header">
            <div>
              <h1>Vista previa</h1>
              <p>Generada a las {previewTimeLabel} · ordenada por fecha y hora</p>
            </div>
            <div className="actividades-corrections__preview-tools">
              <span className="actividades-corrections__expiry">
                <Clock3 aria-hidden="true" />
                Vence en {formatRemainingTime(preview.previewExpiresAt, now)}
              </span>
              <button
                className="actividades-corrections__refresh"
                type="button"
                onClick={loadPreview}
                disabled={!canPreview}
              >
                {previewMutation.isPending ? (
                  <LoaderCircle aria-hidden="true" />
                ) : (
                  <RefreshCw aria-hidden="true" />
                )}
                Actualizar
              </button>
            </div>
          </header>

          <div className="actividades-corrections__summary">
            <div>
              <strong>{preview.totalCount}</strong>
              <span>Sesiones</span>
            </div>
            <div>
              <strong>{preview.changedCount}</strong>
              <span>Se normalizarán</span>
            </div>
            <div>
              <strong>{preview.unchangedCount}</strong>
              <span>Sin cambios</span>
            </div>
            <div className={preview.warningCount > 0 ? "is-warning" : ""}>
              <strong>{preview.warningCount}</strong>
              <span>Revisar horario</span>
            </div>
          </div>

          {preview.warningCount > 0 ? (
            <div className="actividades-corrections__warning">
              <AlertTriangle aria-hidden="true" />
              {preview.warningCount} sesiones se cruzan en horario con otra el mismo día. Revísalas
              antes de normalizar.
            </div>
          ) : null}

          <div className="actividades-corrections__table-wrap">
            <table className="actividades-corrections__modern-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Organizador</th>
                  <th>Código</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => {
                  const formattedDate = formatActivityDate(row.activityDate);
                  const hasScheduleWarning = warningIds.has(row.activityId);
                  return (
                    <tr className={hasScheduleWarning ? "is-warning" : ""} key={row.activityId}>
                      <td className="actividades-corrections__index">{index + 1}</td>
                      <td>
                        <strong>{formattedDate.date}</strong>
                        <small>{formattedDate.weekday}</small>
                      </td>
                      <td>
                        {row.startTime} - {row.endTime}
                      </td>
                      <td>{formatActividadGrupalOrganizer(row.organizer)}</td>
                      <td>
                        <span className="actividades-corrections__code-change">
                          <span>{row.currentActaNumber}</span>
                          <ArrowRight aria-hidden="true" />
                          <strong>{row.proposedActaNumber}</strong>
                        </span>
                      </td>
                      <td>
                        <span
                          className={
                            hasScheduleWarning
                              ? "actividades-corrections__status is-warning"
                              : "actividades-corrections__status"
                          }
                        >
                          <i aria-hidden="true" />
                          {hasScheduleWarning
                            ? "Revisar horario"
                            : row.isDeleted
                              ? "Eliminada"
                              : "Activa"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="actividades-corrections__footer">
            <p>
              <ShieldCheck aria-hidden="true" /> Se pedirá un motivo antes de aplicar el cambio.
            </p>
            <button
              className="actividades-corrections__apply-action"
              type="button"
              onClick={openReasonDialog}
              disabled={applyMutation.isPending || preview.totalCount === 0}
            >
              Normalizar {preview.totalCount} sesiones
            </button>
          </footer>
        </section>
      ) : (
        <section className="actividades-corrections__empty" aria-live="polite">
          <RefreshCw aria-hidden="true" />
          <strong>Genera una vista previa</strong>
          <span>
            Selecciona el centro, la actividad y el prefijo para revisar las sesiones antes de
            normalizar.
          </span>
          <button type="button" onClick={loadPreview} disabled={!canPreview}>
            Generar vista previa
          </button>
        </section>
      )}

      {isReasonDialogOpen ? (
        <div className="actividades-corrections__dialog-backdrop">
          <section
            className="actividades-corrections__reason-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="normalization-reason-title"
          >
            <button
              className="actividades-corrections__dialog-close"
              type="button"
              aria-label="Cerrar"
              onClick={() => setIsReasonDialogOpen(false)}
            >
              <X aria-hidden="true" />
            </button>
            <span className="actividades-corrections__dialog-badge">Corrección masiva</span>
            <h2 id="normalization-reason-title">Normalizar consecutivos</h2>
            <p>
              Se reasignarán {preview?.totalCount ?? 0} actas de {selectedActivityName} en{" "}
              {selectedTenantName}, en orden de fecha y hora.
            </p>
            <div className="actividades-corrections__prefix-change" aria-label="Cambio de prefijo">
              <strong>{currentPrefix}</strong>
              <ArrowRight aria-hidden="true" />
              <strong className="is-new">{targetPrefix}</strong>
            </div>
            <label className="actividades-corrections__reason-field">
              <span>
                Motivo
                <em>Obligatorio</em>
              </span>
              <textarea
                autoFocus
                value={reason}
                maxLength={500}
                placeholder="Ej. Normalización inicial de consecutivos"
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div
              className="actividades-corrections__reason-suggestions"
              aria-label="Motivos sugeridos"
            >
              <button
                type="button"
                onClick={() => setReason("Normalización inicial de consecutivos")}
              >
                Normalización inicial de consecutivos
              </button>
              <button type="button" onClick={() => setReason("Cambio de prefijo de la actividad")}>
                Cambio de prefijo de la actividad
              </button>
            </div>
            <div className="actividades-corrections__dialog-actions">
              <button type="button" onClick={() => setIsReasonDialogOpen(false)}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={applyNormalization}
                disabled={reason.trim() === "" || applyMutation.isPending}
              >
                {applyMutation.isPending ? <LoaderCircle aria-hidden="true" /> : null}
                Normalizar {preview?.totalCount ?? 0} sesiones
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
