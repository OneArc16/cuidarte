import { type AuthUser, type ReportJob, type ReportType } from "@cuidarte/contracts";
import { CalendarDays, Download, FileArchive, FileText, RefreshCw, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useAlimentacionTenantOptionsQuery } from "@/features/alimentacion/model/alimentacion-queries";

import * as reportsApi from "../api/reports-api";
import { downloadReportFile } from "../lib/download-report-file";
import {
  useCancelReportMutation,
  useCreateReportMutation,
  useReportAvailabilityQuery,
  useReportsListQuery,
} from "../model/reports-queries";
import "../reports.css";

type ReportsPageProps = {
  user: AuthUser;
};

const REPORT_TYPES: Array<{
  type: ReportType;
  title: string;
  description: string;
  metricLabel: string;
}> = [
  {
    type: "ACTAS_SESIONES_GRUPALES",
    title: "Actas de sesiones grupales",
    description: "Descarga las actas del mes como PDFs separados dentro de un ZIP.",
    metricLabel: "Actas disponibles",
  },
  {
    type: "FORMATOS_ENTREGA_ALIMENTACION",
    title: "Formatos de entrega de alimentos",
    description: "Un PDF individual por adulto mayor, con nombre, apellido, documento y mes.",
    metricLabel: "Formatos disponibles",
  },
];

export function ReportsPage({ user }: ReportsPageProps) {
  const [period, setPeriod] = useState(getCurrentPeriod());
  const tenantOptionsQuery = useAlimentacionTenantOptionsQuery(user.role === "super_admin");
  const defaultTenantId = user.role === "super_admin" ? null : user.tenantId;
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(defaultTenantId);
  const effectiveTenantId = user.role === "super_admin" ? selectedTenantId : user.tenantId;
  const canQuery = effectiveTenantId !== null;
  const reportsListQuery = useReportsListQuery({
    type: null,
    period,
    tenantId: effectiveTenantId,
  });
  const createReportMutation = useCreateReportMutation();
  const cancelReportMutation = useCancelReportMutation();

  const reportsByType = useMemo(() => {
    const map = new Map<ReportType, ReportJob | null>();

    for (const reportType of REPORT_TYPES) {
      map.set(reportType.type, null);
    }

    for (const report of reportsListQuery.data?.reports ?? []) {
      if (!map.has(report.type)) {
        continue;
      }

      if (map.get(report.type) === null) {
        map.set(report.type, report);
      }
    }

    return map;
  }, [reportsListQuery.data?.reports]);

  const handleCreateReport = async (type: ReportType) => {
    if (effectiveTenantId === null) {
      toast.error("Selecciona un centro.");
      return;
    }

    try {
      await createReportMutation.mutateAsync({ type, period, tenantId: effectiveTenantId });
      toast.success("Reporte solicitado. Puedes seguir trabajando mientras se genera.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible solicitar el reporte.");
    }
  };

  const handleDownloadReport = async (report: ReportJob) => {
    try {
      const download = await reportsApi.downloadReport(report.id);
      const filename = download.filename ?? report.downloadFilename ?? `${report.id}.zip`;

      downloadReportFile(download.blob, filename);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "No fue posible descargar el reporte.");
    }
  };

  return (
    <section className="reports-stack" aria-label="Reportes">
      <section className="reports-filters" aria-label="Filtros de reportes">
        <label className="reports-field">
          <span>Mes</span>
          <input
            type="month"
            value={period}
            onChange={(event) => {
              setPeriod(event.target.value);
            }}
          />
        </label>

        {user.role === "super_admin" ? (
          <label className="reports-field">
            <span>Centro</span>
            <select
              value={selectedTenantId ?? ""}
              onChange={(event) => {
                setSelectedTenantId(event.target.value === "" ? null : event.target.value);
              }}
            >
              <option value="">Seleccionar centro</option>
              {(tenantOptionsQuery.data?.tenants ?? []).map((tenant) => (
                <option key={tenant.id} value={tenant.id}>
                  {tenant.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </section>

      <div className="reports-cards">
        {REPORT_TYPES.map((definition) => (
          <ReportTypeCard
            key={definition.type}
            definition={definition}
            disabled={!canQuery || createReportMutation.isPending}
            latestReport={reportsByType.get(definition.type) ?? null}
            period={period}
            tenantId={effectiveTenantId}
            onCreate={() => {
              void handleCreateReport(definition.type);
            }}
          />
        ))}
      </div>

      <section className="reports-history" aria-labelledby="reports-history-title">
        <div className="reports-history__header">
          <div>
            <p className="eyebrow">Historial</p>
            <h2 id="reports-history-title">Reportes recientes</h2>
          </div>
          <button
            className="outline-action"
            type="button"
            onClick={() => {
              void reportsListQuery.refetch();
            }}
          >
            <RefreshCw aria-hidden="true" />
            <span>Actualizar</span>
          </button>
        </div>

        <div className="reports-table-wrap">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Centro</th>
                <th>Periodo</th>
                <th>Documentos</th>
                <th>Estado</th>
                <th>Accion</th>
              </tr>
            </thead>
            <tbody>
              {(reportsListQuery.data?.reports ?? []).map((report) => (
                <tr key={report.id}>
                  <td>{formatReportType(report.type)}</td>
                  <td>{report.tenantName}</td>
                  <td>{report.period}</td>
                  <td>
                    {report.totalDocuments === null
                      ? `${report.processedDocuments} procesados`
                      : `${report.processedDocuments}/${report.totalDocuments}`}
                  </td>
                  <td>
                    <span className={`reports-status reports-status--${report.status}`}>
                      {formatReportStatus(report.status)}
                    </span>
                  </td>
                  <td>
                    <div className="reports-row-actions">
                      {report.downloadAvailable ? (
                        <button
                          className="icon-action"
                          type="button"
                          aria-label={`Descargar ${formatReportType(report.type)}`}
                          title="Descargar"
                          onClick={() => {
                            void handleDownloadReport(report);
                          }}
                        >
                          <Download aria-hidden="true" />
                          <span>Descargar</span>
                        </button>
                      ) : null}
                      {report.status === "pending" || report.status === "processing" ? (
                        <button
                          className="icon-action icon-action--danger"
                          type="button"
                          aria-label={`Cancelar ${formatReportType(report.type)}`}
                          title="Cancelar"
                          disabled={cancelReportMutation.isPending}
                          onClick={() => {
                            void cancelReportMutation.mutateAsync(report.id);
                          }}
                        >
                          <XCircle aria-hidden="true" />
                          <span>Cancelar</span>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
              {(reportsListQuery.data?.reports ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6}>No hay reportes recientes para los filtros seleccionados.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  );
}

type ReportTypeCardProps = {
  definition: (typeof REPORT_TYPES)[number];
  disabled: boolean;
  latestReport: ReportJob | null;
  period: string;
  tenantId: string | null;
  onCreate: () => void;
};

function ReportTypeCard({
  definition,
  disabled,
  latestReport,
  period,
  tenantId,
  onCreate,
}: ReportTypeCardProps) {
  const availabilityQuery = useReportAvailabilityQuery(
    { type: definition.type, period, tenantId },
    tenantId !== null,
  );
  const availableDocuments = availabilityQuery.data?.availableDocuments ?? 0;
  const isActive = latestReport?.status === "pending" || latestReport?.status === "processing";

  return (
    <article className="reports-card">
      <div className="reports-card__icon" aria-hidden="true">
        {definition.type === "ACTAS_SESIONES_GRUPALES" ? <FileText /> : <FileArchive />}
      </div>
      <div className="reports-card__body">
        <h2>{definition.title}</h2>
        <p>{definition.description}</p>
        <dl>
          <div>
            <dt>{definition.metricLabel}</dt>
            <dd>{availabilityQuery.isLoading ? "..." : availableDocuments}</dd>
          </div>
          {definition.type === "FORMATOS_ENTREGA_ALIMENTACION" ? (
            <div>
              <dt>Importados</dt>
              <dd>{availabilityQuery.data?.importedDocuments ?? 0}</dd>
            </div>
          ) : null}
        </dl>
      </div>
      <button
        className="primary-action reports-card__action"
        type="button"
        disabled={disabled || availabilityQuery.isLoading || availableDocuments === 0 || isActive}
        onClick={onCreate}
      >
        <CalendarDays aria-hidden="true" />
        <span>{isActive ? "Generando" : "Generar ZIP"}</span>
      </button>
    </article>
  );
}

function getCurrentPeriod(): string {
  const now = new Date();

  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatReportType(type: ReportType): string {
  return type === "ACTAS_SESIONES_GRUPALES" ? "Actas de sesiones" : "Formatos de alimentacion";
}

function formatReportStatus(status: ReportJob["status"]): string {
  const labels: Record<ReportJob["status"], string> = {
    pending: "Pendiente",
    processing: "Procesando",
    ready: "Listo",
    empty: "Sin documentos",
    failed: "Error",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  return labels[status];
}
