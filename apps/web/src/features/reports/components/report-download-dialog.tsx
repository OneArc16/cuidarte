import * as Dialog from "@radix-ui/react-dialog";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FileArchive,
  Grid2x2,
  LoaderCircle,
  Minimize2,
  XCircle,
} from "lucide-react";

import { useReportDownloads, type ReportDownloadTask } from "../model/report-downloads-context";
import "../reports.css";

export function ReportDownloadDialog() {
  const { tasks, isOpen, minimizeReportDownloads, cancelReport, removeTask } = useReportDownloads();

  return (
    <Dialog.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          minimizeReportDownloads();
        }
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="report-download-dialog__overlay" />
        <Dialog.Content className="report-download-dialog">
          <header className="report-download-dialog__header">
            <div>
              <p className="report-download-dialog__eyebrow">
                <Grid2x2 aria-hidden="true" />
                <span>Centro de actividad</span>
              </p>
              <Dialog.Title className="report-download-dialog__title">
                Descargas de reportes
              </Dialog.Title>
              <Dialog.Description className="report-download-dialog__description">
                Puedes continuar trabajando mientras tus reportes se preparan.
              </Dialog.Description>
            </div>
            <button
              className="report-download-dialog__icon-button"
              type="button"
              aria-label="Minimizar descargas de reportes"
              data-tooltip="Minimizar"
              onClick={minimizeReportDownloads}
            >
              <Minimize2 aria-hidden="true" />
            </button>
          </header>

          <div className="report-download-dialog__list" aria-live="polite">
            {tasks.length > 0 ? (
              tasks.map((task) => (
                <ReportDownloadTaskRow
                  key={task.reportId}
                  task={task}
                  onCancel={cancelReport}
                  onRemove={removeTask}
                />
              ))
            ) : (
              <p className="report-download-dialog__empty">No hay descargas activas.</p>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function ReportDownloadTaskRow({
  task,
  onCancel,
  onRemove,
}: {
  task: ReportDownloadTask;
  onCancel: (reportId: string) => Promise<void>;
  onRemove: (reportId: string) => void;
}) {
  const progress = getTaskProgress(task);
  const isTransferring =
    task.transferStatus === "preparing" || task.transferStatus === "downloading";
  const isGenerating = task.status === "pending" || task.status === "processing";
  const isActive = isGenerating || isTransferring;
  const isReady = task.status === "ready" && !isTransferring;
  const isTerminal =
    ["empty", "failed", "cancelled", "expired"].includes(task.status) ||
    task.transferStatus === "cancelled";
  const displayStatus = getTaskDisplayStatus(task);

  return (
    <article className="report-download-task">
      <div className="report-download-task__icon" aria-hidden="true">
        {isReady ? <Download /> : isTerminal ? <AlertCircle /> : <FileArchive />}
      </div>
      <div className="report-download-task__body">
        <div className="report-download-task__heading">
          <div>
            <h3>
              {task.analyticsFormat
                ? `Estadisticas en ${task.analyticsFormat.toUpperCase()}`
                : formatReportType(task.type)}
            </h3>
            <p>
              {task.tenantName} <span className="report-download-task__period">{task.period}</span>
            </p>
          </div>
          <span
            className={`report-download-task__status report-download-task__status--${displayStatus}`}
          >
            {formatTaskStatus(task, displayStatus)}
          </span>
        </div>

        <div className="report-download-task__progress-row">
          <div
            className="report-download-task__progress"
            role="progressbar"
            aria-label={`Progreso de ${formatReportType(task.type)}`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress ?? undefined}
            data-indeterminate={progress === null ? "true" : undefined}
          >
            <span style={progress === null ? undefined : { width: `${progress}%` }} />
          </div>
        </div>

        <div className="report-download-task__footer">
          <span className="report-download-task__progress-label">
            <span className="report-download-task__state-dot" aria-hidden="true" />
            {formatProgressLabel(task, progress)}
          </span>

          <div className="report-download-task__actions">
            {isActive ? (
              <button
                className="report-download-task__cancel"
                type="button"
                onClick={() => void onCancel(task.reportId)}
              >
                <XCircle aria-hidden="true" />
                <span>Cancelar</span>
              </button>
            ) : isReady ? (
              <span className="report-download-task__downloaded">
                <CheckCircle2 aria-hidden="true" />
                <span>Descargado</span>
              </span>
            ) : isTerminal ? (
              <button
                className="report-download-task__dismiss"
                type="button"
                aria-label={`Quitar ${formatReportType(task.type)}`}
                data-tooltip="Quitar"
                onClick={() => onRemove(task.reportId)}
              >
                <CheckCircle2 aria-hidden="true" />
              </button>
            ) : (
              <LoaderCircle aria-hidden="true" className="report-download-task__spinner" />
            )}
          </div>
        </div>

        <p
          className={
            task.errorMessage === null
              ? "report-download-task__note"
              : "report-download-task__error"
          }
        >
          {task.errorMessage ?? getTaskNote(task)}
        </p>
      </div>
    </article>
  );
}

function getTaskProgress(task: ReportDownloadTask): number | null {
  if (task.transferStatus === "preparing") {
    return null;
  }

  if (task.transferStatus === "downloading") {
    if (task.totalBytes === null || task.totalBytes === 0) {
      return null;
    }

    return Math.min(100, Math.round((task.downloadedBytes / task.totalBytes) * 100));
  }

  if (task.totalDocuments === null || task.totalDocuments === 0) {
    return null;
  }

  return Math.min(100, Math.round((task.processedDocuments / task.totalDocuments) * 100));
}

function formatProgressLabel(task: ReportDownloadTask, progress: number | null): string {
  if (task.transferStatus === "preparing") {
    return task.analyticsFormat
      ? `Preparando ${task.analyticsFormat.toUpperCase()}`
      : "Preparando ZIP";
  }

  if (task.transferStatus === "downloading") {
    return progress === null ? "Descargando" : `${progress}%`;
  }

  if (task.status === "ready") {
    return "Listo";
  }

  if (progress === null) {
    return "En curso";
  }

  return `${progress}% · ${task.processedDocuments}/${task.totalDocuments}`;
}

function formatReportType(type: ReportDownloadTask["type"]): string {
  return type === "ACTAS_SESIONES_GRUPALES" ? "Actas de sesiones" : "Formatos de alimentos";
}

type ReportTaskDisplayStatus = ReportDownloadTask["status"] | "preparing" | "downloading";

function getTaskDisplayStatus(task: ReportDownloadTask): ReportTaskDisplayStatus {
  if (task.transferStatus === "preparing") {
    return "preparing";
  }

  if (task.transferStatus === "downloading") {
    return "downloading";
  }

  if (task.transferStatus === "cancelled") {
    return "cancelled";
  }

  return task.status;
}

function formatTaskStatus(
  task: ReportDownloadTask,
  displayStatus: ReportTaskDisplayStatus,
): string {
  if (displayStatus === "preparing") {
    return "Preparando descarga";
  }

  if (displayStatus === "downloading") {
    return "Descargando";
  }

  if (task.transferStatus === "cancelled") {
    return "Descarga cancelada";
  }

  const labels: Record<ReportDownloadTask["status"], string> = {
    pending: "Pendiente",
    processing: "Procesando",
    ready: "Listo",
    empty: "Sin documentos",
    failed: "Error",
    cancelled: "Cancelado",
    expired: "Expirado",
  };

  return labels[task.status];
}

function getTaskNote(task: ReportDownloadTask): string {
  if (task.status === "ready") {
    return "Tu reporte ya está disponible.";
  }

  if (task.transferStatus === "downloading") {
    return "La descarga continuará mientras trabajas.";
  }

  return "Te avisaremos cuando esté listo.";
}
