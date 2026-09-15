import { type AuthUser } from "@cuidarte/contracts";
import {
  FileSpreadsheet,
  FileText,
  Presentation,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import {
  useReportsDashboardQuery,
} from "../model/reports-queries";
import { ReportDashboard } from "../components/report-dashboard";
import { ReportDateRangePicker } from "../components/report-date-range-picker";
import { useReportDownloads } from "../model/report-downloads-context";
import "../reports.css";

type ReportsPageProps = {
  user: AuthUser;
};

export function ReportsPage({ user: _user }: ReportsPageProps) {
  const [dateRange, setDateRange] = useState(getInitialDateRange);
  const [exportingFormat, setExportingFormat] = useState<"pdf" | "pptx" | "xlsx" | null>(null);
  const dashboardQuery = useReportsDashboardQuery(dateRange);
  const { startAnalyticsExport } = useReportDownloads();

  const handleExport = async (format: "pdf" | "pptx" | "xlsx") => {
    setExportingFormat(format);
    try {
      await startAnalyticsExport({ ...dateRange, format });
      toast.success("Exportacion solicitada. Puedes seguir trabajando mientras se prepara.");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : `No fue posible generar el ${format.toUpperCase()}.`,
      );
    } finally { setExportingFormat(null); }
  };

  return (
    <section className="reports-stack" aria-label="Reportes">
      <header className="reports-page-header">
        <p className="eyebrow">Centro de actividad</p>
        <div className="reports-header-actions">
          <ReportDateRangePicker from={dateRange.from} to={dateRange.to} onApply={setDateRange} />
          <button className="reports-export-button reports-export-button--excel" type="button" aria-label="Exportar a Excel" title={exportingFormat === "xlsx" ? "Generando Excel" : "Exportar a Excel"} disabled={exportingFormat !== null || dashboardQuery.isLoading} onClick={() => void handleExport("xlsx")}>
            <FileSpreadsheet aria-hidden="true" />
            <span className="visually-hidden">{exportingFormat === "xlsx" ? "Generando Excel" : "Exportar a Excel"}</span>
          </button>
          <button className="reports-export-button reports-export-button--pdf" type="button" aria-label="Exportar a PDF" title={exportingFormat === "pdf" ? "Generando PDF" : "Exportar a PDF"} disabled={exportingFormat !== null || dashboardQuery.isLoading} onClick={() => void handleExport("pdf")}>
            <FileText aria-hidden="true" />
            <span className="visually-hidden">{exportingFormat === "pdf" ? "Generando PDF" : "Exportar a PDF"}</span>
          </button>
          <button className="reports-export-button reports-export-button--pptx" type="button" aria-label="Exportar a PowerPoint" title={exportingFormat === "pptx" ? "Generando PowerPoint" : "Exportar a PowerPoint"} disabled={exportingFormat !== null || dashboardQuery.isLoading} onClick={() => void handleExport("pptx")}>
            <Presentation aria-hidden="true" />
            <span className="visually-hidden">{exportingFormat === "pptx" ? "Generando PowerPoint" : "Exportar a PowerPoint"}</span>
          </button>
        </div>
      </header>

      <ReportDashboard
        data={dashboardQuery.data}
        isLoading={dashboardQuery.isLoading}
        isError={dashboardQuery.isError}
      />

    </section>
  );
}

function getInitialDateRange(): { from: string; to: string } {
  const today = new Date();
  const to = today.toISOString().slice(0, 10);
  const fromDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));

  return { from: fromDate.toISOString().slice(0, 10), to };
}
