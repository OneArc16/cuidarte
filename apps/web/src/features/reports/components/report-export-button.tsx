import { Download, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { type ReportType } from "@cuidarte/contracts";

import * as reportsApi from "../api/reports-api";
import { downloadReportFile } from "../lib/download-report-file";

type ReportExportButtonProps = {
  type: ReportType;
  period: string;
  tenantId: string | null;
  className?: string;
};

export function ReportExportButton({ type, period, tenantId, className }: ReportExportButtonProps) {
  const [reportId, setReportId] = useState<string | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);

  useEffect(() => {
    if (reportId === null) return;
    let cancelled = false;
    const poll = async () => {
      try {
        const { report } = await reportsApi.getReport(reportId);
        if (cancelled) return;
        if (report.status === "ready") {
          const download = await reportsApi.downloadReport(report.id);
          downloadReportFile(
            download.blob,
            download.filename ?? report.downloadFilename ?? `${report.id}.zip`,
          );
          setReportId(null);
          toast.success("ZIP descargado correctamente.");
        } else if (["failed", "empty", "cancelled", "expired"].includes(report.status)) {
          setReportId(null);
          toast.error(report.message ?? "No fue posible generar el ZIP.");
        } else {
          window.setTimeout(() => void poll(), 3000);
        }
      } catch (error) {
        if (!cancelled) {
          setReportId(null);
          toast.error(
            error instanceof Error ? error.message : "No fue posible consultar la exportación.",
          );
        }
      }
    };
    void poll();
    return () => {
      cancelled = true;
    };
  }, [reportId]);

  async function exportReport() {
    setIsRequesting(true);
    try {
      const response = await reportsApi.createReport({ type, period, tenantId });
      setReportId(response.report.id);
      toast.info("Exportación iniciada. El ZIP se descargará al estar listo.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No fue posible iniciar la exportación.",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  const isBusy = isRequesting || reportId !== null;
  const isDisabled = isBusy || tenantId === null;
  return (
    <button
      className={className ?? "icon-action report-export-button"}
      type="button"
      aria-label={isBusy ? "Generando ZIP" : "Exportar ZIP"}
      onClick={() => void exportReport()}
      disabled={isDisabled}
      title={tenantId === null ? "Selecciona un centro para exportar" : undefined}
    >
      {isBusy ? (
        <LoaderCircle className="animate-spin" aria-hidden="true" />
      ) : (
        <Download aria-hidden="true" />
      )}
      <span className="visually-hidden">{isBusy ? "Generando ZIP…" : "Exportar ZIP"}</span>
    </button>
  );
}
