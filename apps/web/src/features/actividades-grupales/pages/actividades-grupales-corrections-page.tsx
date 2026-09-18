import {
  type ActividadGrupalActaCorrectionPreviewResponse,
  type ActividadGrupalOrganizer,
  actividadGrupalOrganizerValues,
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
import {
  useActividadGrupalTenantOptionsQuery,
  useApplyActividadGrupalActaCorrectionMutation,
  usePreviewActividadGrupalActaCorrectionMutation,
} from "../model/actividades-grupales-queries";

type Props = { navigate: Navigate; user: AuthUser };

export function ActividadesGrupalesCorrectionsPage({ navigate, user }: Props) {
  const [tenantId, setTenantId] = useState("");
  const [organizer, setOrganizer] = useState<ActividadGrupalOrganizer | null>(null);
  const [reason, setReason] = useState("Normalizacion inicial de consecutivos por organizador");
  const [preview, setPreview] = useState<ActividadGrupalActaCorrectionPreviewResponse | null>(null);
  const tenantOptionsQuery = useActividadGrupalTenantOptionsQuery(user.role === "super_admin");
  const previewMutation = usePreviewActividadGrupalActaCorrectionMutation();
  const applyMutation = useApplyActividadGrupalActaCorrectionMutation();
  const canApply =
    preview !== null &&
    reason.trim().length > 0;

  function loadPreview() {
    if (tenantId === "") {
      toast.error("Selecciona un centro.");
      return;
    }

    previewMutation.mutate({ tenantId, organizer }, {
      onSuccess: setPreview,
      onError: (error) =>
        toast.error(
          resolveActividadesGrupalesApiError(error) ?? "No fue posible generar la vista previa.",
        ),
    });
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
          <span>Organizador</span>
          <select
            value={organizer ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              setOrganizer(value === "" ? null : (value as ActividadGrupalOrganizer));
              setPreview(null);
            }}
            disabled={
              tenantOptionsQuery.isLoading || previewMutation.isPending || applyMutation.isPending
            }
          >
            <option value="">Todos los organizadores</option>
            {actividadGrupalOrganizerValues.map((value) => (
              <option key={value} value={value}>
                {formatActividadGrupalOrganizer(value)}
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
