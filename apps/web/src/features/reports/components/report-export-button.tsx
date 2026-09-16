import { Download, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { type ReportType } from "@cuidarte/contracts";

import * as reportsApi from "../api/reports-api";
import { useReportDownloads } from "../model/report-downloads-context";

type ReportExportButtonProps = {
  type: ReportType;
  period: string;
  tenantId: string | null;
  className?: string;
};

export function ReportExportButton({ type, period, tenantId, className }: ReportExportButtonProps) {
  const [isRequesting, setIsRequesting] = useState(false);
  const { tasks, registerReport } = useReportDownloads();

  async function exportReport() {
    setIsRequesting(true);
    try {
      const response = await reportsApi.createReport({ type, period, tenantId });
      registerReport(response.report);
      toast.info("Exportación iniciada. El ZIP se descargará al estar listo.");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "No fue posible iniciar la exportación.",
      );
    } finally {
      setIsRequesting(false);
    }
  }

  const isBusy =
    isRequesting ||
    tasks.some(
      (task) =>
        task.type === type &&
        task.period === period &&
        (task.status === "pending" || task.status === "processing" || task.status === "ready"),
    );
  const isDisabled = isBusy || tenantId === null;
  return (
    <button
      className={className ?? "icon-action report-export-button"}
      type="button"
      aria-label={isBusy ? "Generando ZIP" : "Exportar ZIP"}
      onClick={() => void exportReport()}
      disabled={isDisabled}
      data-tooltip={tenantId === null ? "Selecciona un centro para exportar" : "Generar ZIP"}
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
