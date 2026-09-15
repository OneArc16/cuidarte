import * as Dialog from "@radix-ui/react-dialog";
import { CheckCircle2, Download, History, XCircle } from "lucide-react";
import { useState } from "react";
import { type ReportJob, type ReportStatus, type ReportType } from "@cuidarte/contracts";

import { useReportDownloads } from "../model/report-downloads-context";
import { useReportsListQuery } from "../model/reports-queries";
import "../reports.css";

type ReportHistoryButtonProps = {
  type: ReportType;
  period: string;
  tenantId: string | null;
};

export function ReportHistoryButton({ type, period, tenantId }: ReportHistoryButtonProps) {
  const [open, setOpen] = useState(false);
  const query = useReportsListQuery({ type, period, tenantId });
  const { startReportDownload, cancelReport } = useReportDownloads();

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <button className="report-history-button" type="button" aria-label="Ver historial de descargas" title="Historial de descargas">
          <History aria-hidden="true" />
          <span className="visually-hidden">Ver historial de descargas</span>
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="report-history-dialog__overlay" />
        <Dialog.Content className="report-history-dialog">
          <div className="report-history-dialog__header">
            <div>
              <Dialog.Title>Historial de descargas</Dialog.Title>
              <Dialog.Description>{type === "ACTAS_SESIONES_GRUPALES" ? "Actas de sesiones grupales" : "Formatos de entrega de alimentos"} · {period}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button className="report-history-dialog__close" type="button" aria-label="Cerrar historial">×</button>
            </Dialog.Close>
          </div>
          {query.isLoading ? <p className="report-history-dialog__state">Cargando historial...</p> : null}
          {query.isError ? <p className="report-history-dialog__state report-history-dialog__state--error">No fue posible cargar el historial.</p> : null}
          {!query.isLoading && !query.isError ? <div className="report-history-dialog__list">{(query.data?.reports ?? []).map((report) => <HistoryRow key={report.id} report={report} onDownload={() => startReportDownload(report)} onCancel={() => void cancelReport(report.id)} />)}{(query.data?.reports ?? []).length === 0 ? <p className="report-history-dialog__state">No hay descargas para este filtro.</p> : null}</div> : null}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function HistoryRow({ report, onDownload, onCancel }: { report: ReportJob; onDownload: () => void; onCancel: () => void }) {
  const active = report.status === "pending" || report.status === "processing";
  return (
    <article className="report-history-row">
      <div><strong>{formatReportType(report.type)}</strong><span>{report.tenantName}</span><span>{report.period}</span></div>
      <span className={`report-history-row__status report-history-row__status--${report.status}`}>{formatStatus(report.status)}</span>
      <div className="report-history-row__actions">
        {report.downloadAvailable ? <button className="report-history-row__icon" type="button" aria-label="Descargar reporte" title="Descargar" onClick={onDownload}><Download aria-hidden="true" /></button> : null}
        {active ? <button className="report-history-row__icon report-history-row__icon--danger" type="button" aria-label="Cancelar reporte" title="Cancelar" onClick={onCancel}><XCircle aria-hidden="true" /></button> : null}
        {report.status === "ready" && !report.downloadAvailable ? <CheckCircle2 aria-label="Reporte listo pero expirado" /> : null}
      </div>
    </article>
  );
}

function formatReportType(type: ReportType) { return type === "ACTAS_SESIONES_GRUPALES" ? "Actas de sesiones" : "Formatos de alimentos"; }
function formatStatus(status: ReportStatus) { return { pending: "Pendiente", processing: "Procesando", ready: "Listo", empty: "Sin documentos", failed: "Fallido", cancelled: "Cancelado", expired: "Expirado" }[status]; }
