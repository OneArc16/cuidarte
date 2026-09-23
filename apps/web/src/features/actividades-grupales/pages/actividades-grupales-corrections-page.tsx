import {
  type ActividadGrupalActaCorrectionPreviewResponse,
  type ActividadGrupalOrganizer,
  type ActividadGrupalTipo,
  type AuthUser,
} from "@cuidarte/contracts";
import { ChevronLeft, LoaderCircle, RefreshCw, ShieldAlert } from "lucide-react";
import { useState } from "react";
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
  useApplyActividadGrupalActaCorrectionMutation,
  useApplyActividadGrupalActaPrefixCorrectionMutation,
  usePreviewActividadGrupalActaPrefixCorrectionMutation,
  usePreviewActividadGrupalActaCorrectionMutation,
} from "../model/actividades-grupales-queries";

type Props = { navigate: Navigate; user: AuthUser };

const ACTA_SERIES_OPTIONS: readonly { value: ActividadGrupalOrganizer; label: string }[] = [
  { value: "director", label: "DIREC — Director" },
  { value: "medico", label: "SALUD — Médico y Enfermería" },
  { value: "psicologa", label: "PSICO — Psicología y Trabajo Social" },
  { value: "nutricionista", label: "NUTRI — Nutrición" },
  { value: "fisioterapeuta", label: "FISIO — Fisioterapia" },
  { value: "recreacionista", label: "RECRE — Recreación" },
];

export function ActividadesGrupalesCorrectionsPage({ navigate, user }: Props) {
  const [tenantId, setTenantId] = useState("");
  const [seriesOrganizer, setSeriesOrganizer] = useState<ActividadGrupalOrganizer | null>(null);
  const [reason, setReason] = useState("Normalizacion inicial de consecutivos por serie");
  const [preview, setPreview] = useState<ActividadGrupalActaCorrectionPreviewResponse | null>(null);
  const [prefixPreview, setPrefixPreview] = useState<ActividadGrupalActaCorrectionPreviewResponse | null>(null);
  const [prefixActivityTypeId, setPrefixActivityTypeId] = useState("");
  const [targetPrefix, setTargetPrefix] = useState("");
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(user.role === "super_admin");
  const previewMutation = usePreviewActividadGrupalActaCorrectionMutation();
  const applyMutation = useApplyActividadGrupalActaCorrectionMutation();
  const prefixPreviewMutation = usePreviewActividadGrupalActaPrefixCorrectionMutation();
  const prefixApplyMutation = useApplyActividadGrupalActaPrefixCorrectionMutation();
  const activityTypesQuery = useActividadGrupalTiposQuery(
    { tenantId: tenantId === "" ? null : tenantId, includeInactive: false },
    tenantId !== "",
  );
  const specialActivityTypes = (activityTypesQuery.data?.activityTypes ?? []).filter(
    (activityType) => activityType.consecutiveConfig !== null,
  );
  const canApply = preview !== null && reason.trim().length > 0;

  function loadPreview() {
    if (tenantId === "") {
      toast.error("Selecciona un centro.");
      return;
    }

    previewMutation.mutate(
      { tenantId, organizer: seriesOrganizer },
      {
        onSuccess: setPreview,
        onError: (error) =>
          toast.error(
            resolveActividadesGrupalesApiError(error) ?? "No fue posible generar la vista previa.",
          ),
      },
    );
  }

  function applyCorrection() {
    if (!canApply || preview === null) return;

    applyMutation.mutate(
      { operationToken: preview.operationToken, reason: reason.trim() },
      {
        onSuccess: (result) => {
          toast.success(`${result.changedCount} actas corregidas correctamente.`);
          setPreview(null);
        },
        onError: (error) =>
          toast.error(
            resolveActividadesGrupalesApiError(error) ?? "La vista previa ya no esta vigente.",
          ),
      },
    );
  }

  function loadPrefixPreview() {
    if (tenantId === "" || prefixActivityTypeId === "") {
      toast.error("Selecciona un centro y una actividad especial.");
      return;
    }

    prefixPreviewMutation.mutate(
      { tenantId, activityTypeId: prefixActivityTypeId, prefix: targetPrefix },
      {
        onSuccess: (result) => {
          setPreview(null);
          setPrefixPreview(result);
        },
        onError: (error) =>
          toast.error(
            resolveActividadesGrupalesApiError(error) ?? "No fue posible generar la vista previa.",
          ),
      },
    );
  }

  function applyPrefixCorrection() {
    if (prefixPreview === null || reason.trim() === "") return;

    prefixApplyMutation.mutate(
      { operationToken: prefixPreview.operationToken, reason: reason.trim() },
      {
        onSuccess: (result) => {
          toast.success(`${result.changedCount} actas migradas al nuevo prefijo.`);
          setPrefixPreview(null);
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
      <div className="actividades-form-nav">
        <button
          className="outline-action actividades-back-action"
          type="button"
          onClick={() => navigate(CREACION_ACTIVIDADES_PATH)}
        >
          <ChevronLeft aria-hidden="true" />
          <span>Volver</span>
        </button>
        <span className="actividades-form-nav__context">Correccion administrativa</span>
      </div>

      <section className="actividades-corrections__controls" aria-label="Parametros de correccion">
        <label className="actividades-corrections__tenant-field">
          <span>Centro</span>
          <select
            value={tenantId}
            onChange={(event) => {
              setTenantId(event.target.value);
              setPreview(null);
              setPrefixPreview(null);
              setPrefixActivityTypeId("");
              setTargetPrefix("");
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
        <label className="actividades-corrections__tenant-field">
          <span>Serie de consecutivos</span>
          <select
            value={seriesOrganizer ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setSeriesOrganizer(value === "" ? null : (value as ActividadGrupalOrganizer));
              setPreview(null);
            }}
            disabled={
              tenantOptionsQuery.isLoading || previewMutation.isPending || applyMutation.isPending
            }
          >
            <option value="">Todas las series</option>
            {ACTA_SERIES_OPTIONS.map((series) => (
              <option key={series.value} value={series.value}>
                {series.label}
              </option>
            ))}
          </select>
        </label>
        <button
          className="outline-action actividades-corrections__preview-action"
          type="button"
          aria-label="Generar vista previa"
          data-tooltip="Generar vista previa"
          onClick={loadPreview}
          disabled={tenantId === "" || previewMutation.isPending || applyMutation.isPending}
        >
          {previewMutation.isPending ? (
            <LoaderCircle className="actividad-delete-dialog__spinner" aria-hidden="true" />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}
        </button>
      </section>

      <section className="actividades-corrections__prefix-migration" aria-label="Migrar prefijo histórico">
        <div>
          <span className="eyebrow">Serie especial</span>
          <h2>Migrar prefijo histórico</h2>
          <p>Conserva el consecutivo y actualiza las actas diligenciadas al nuevo prefijo.</p>
        </div>
        <div className="actividades-corrections__controls">
          <label className="actividades-corrections__tenant-field">
            <span>Actividad especial</span>
            <select
              value={prefixActivityTypeId}
              onChange={(event) => {
                const activityTypeId = event.target.value;
                setPrefixActivityTypeId(activityTypeId);
                const activityType = specialActivityTypes.find((item) => item.id === activityTypeId);
                setTargetPrefix(activityType?.consecutiveConfig?.prefix ?? "");
                setPrefixPreview(null);
              }}
              disabled={tenantId === "" || activityTypesQuery.isLoading || prefixPreviewMutation.isPending || prefixApplyMutation.isPending}
            >
              <option value="">Seleccionar actividad</option>
              {specialActivityTypes.map((activityType: ActividadGrupalTipo) => (
                <option key={activityType.id} value={activityType.id}>
                  {activityType.name} · {activityType.consecutiveConfig?.prefix}
                </option>
              ))}
            </select>
          </label>
          <label className="actividades-corrections__tenant-field">
            <span>Nuevo prefijo</span>
            <input
              value={targetPrefix}
              maxLength={24}
              placeholder="NUEVO"
              onChange={(event) => {
                setTargetPrefix(event.target.value.toUpperCase());
                setPrefixPreview(null);
              }}
              disabled={prefixActivityTypeId === "" || prefixPreviewMutation.isPending || prefixApplyMutation.isPending}
            />
          </label>
          <button
            className="outline-action actividades-corrections__preview-action"
            type="button"
            aria-label="Vista previa de migración de prefijo"
            data-tooltip="Vista previa de prefijo"
            onClick={loadPrefixPreview}
            disabled={
              tenantId === "" ||
              prefixActivityTypeId === "" ||
              !/^[A-Z0-9]{2,24}$/.test(targetPrefix) ||
              prefixPreviewMutation.isPending ||
              prefixApplyMutation.isPending
            }
          >
            {prefixPreviewMutation.isPending ? (
              <LoaderCircle className="actividad-delete-dialog__spinner" aria-hidden="true" />
            ) : (
              <RefreshCw aria-hidden="true" />
            )}
          </button>
        </div>
      </section>

      {prefixPreview !== null ? (
        <section className="actividades-corrections__preview" aria-live="polite">
          <div className="actividades-corrections__summary">
            <div><strong>{prefixPreview.totalCount}</strong><span>Total</span></div>
            <div><strong>{prefixPreview.changedCount}</strong><span>Migrarán</span></div>
            <div><strong>{prefixPreview.unchangedCount}</strong><span>Sin cambios</span></div>
          </div>
          <p className="actividades-corrections__notice">
            <ShieldAlert aria-hidden="true" /> Confirma cada cambio. El número anterior quedará en el historial y esta vista previa vence en 15 minutos.
          </p>
          <div className="actividades-table-wrap">
            <table className="actividades-table actividades-corrections__table">
              <thead><tr><th>Fecha</th><th>Actual</th><th>Nuevo</th></tr></thead>
              <tbody>
                {prefixPreview.rows.map((row) => (
                  <tr key={row.activityId}>
                    <td>{row.activityDate}</td>
                    <td>{row.currentActaNumber}</td>
                    <td><strong>{row.proposedActaNumber}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actividades-corrections__apply">
            <label>
              Motivo de la migración
              <input value={reason} maxLength={500} onChange={(event) => setReason(event.target.value)} />
            </label>
            <button
              className="outline-action actividades-corrections__apply-action"
              type="button"
              onClick={applyPrefixCorrection}
              disabled={reason.trim() === "" || prefixApplyMutation.isPending}
            >
              {prefixApplyMutation.isPending ? <LoaderCircle className="actividad-delete-dialog__spinner" aria-hidden="true" /> : null}
              Migrar prefijo
            </button>
          </div>
        </section>
      ) : null}

      {preview !== null ? (
        <section className="actividades-corrections__preview" aria-live="polite">
          <div className="actividades-corrections__summary">
            <div>
              <strong>{preview.totalCount}</strong>
              <span>Total</span>
            </div>
            <div>
              <strong>{preview.changedCount}</strong>
              <span>Cambiaran</span>
            </div>
            <div>
              <strong>{preview.unchangedCount}</strong>
              <span>Sin cambios</span>
            </div>
            <div>
              <strong>{preview.warningCount}</strong>
              <span>Revisar horario</span>
            </div>
          </div>
          <p className="actividades-corrections__notice">
            <ShieldAlert aria-hidden="true" /> Revisa que las horas historicas esten en formato de
            24 horas. Esta vista previa vence en 15 minutos.
          </p>
          <div className="actividades-table-wrap">
            <table className="actividades-table actividades-corrections__table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>Organizador</th>
                  <th>Actual</th>
                  <th>Nuevo</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr key={row.activityId}>
                    <td>{row.activityDate}</td>
                    <td>
                      {row.startTime} - {row.endTime}
                    </td>
                    <td>{formatActividadGrupalOrganizer(row.organizer)}</td>
                    <td>{row.currentActaNumber}</td>
                    <td>
                      <strong>{row.proposedActaNumber}</strong>
                    </td>
                    <td>{row.isDeleted ? "Eliminada" : "Activa"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="actividades-corrections__apply">
            <label>
              Motivo de la correccion
              <input
                value={reason}
                maxLength={500}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button
              className="outline-action actividades-corrections__apply-action"
              type="button"
              onClick={applyCorrection}
              disabled={!canApply || applyMutation.isPending}
            >
              {applyMutation.isPending ? (
                <LoaderCircle className="actividad-delete-dialog__spinner" aria-hidden="true" />
              ) : null}
              Aplicar correccion
            </button>
          </div>
        </section>
      ) : null}
    </section>
  );
}
