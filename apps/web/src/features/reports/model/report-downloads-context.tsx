import { type ReportJob, type ReportStatus, type ReportType } from "@cuidarte/contracts";
import { useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

import * as reportsApi from "../api/reports-api";
import { downloadReportFile } from "../lib/download-report-file";

export type ReportDownloadTask = {
  reportId: string;
  type: ReportType;
  tenantName: string;
  period: string;
  status: ReportStatus;
  processedDocuments: number;
  totalDocuments: number | null;
  downloadedBytes: number;
  totalBytes: number | null;
  transferStatus: "idle" | "preparing" | "downloading" | "cancelled";
  errorMessage: string | null;
};

type ReportDownloadsContextValue = {
  tasks: ReportDownloadTask[];
  isOpen: boolean;
  openReportDownloads: () => void;
  minimizeReportDownloads: () => void;
  registerTask: (task: ReportDownloadTask) => void;
  registerReport: (report: ReportJob) => void;
  startReportDownload: (report: ReportJob) => void;
  cancelReport: (reportId: string) => Promise<void>;
  removeTask: (reportId: string) => void;
};

type ReportDownloadsProviderProps = {
  children: ReactNode;
  recoverOnMount?: boolean;
};

const REPORT_DOWNLOADS_TOAST_ID = "report-downloads-queue";
const REPORT_POLL_INTERVAL_MS = 3_000;

const ReportDownloadsContext = createContext<ReportDownloadsContextValue | null>(null);

export function ReportDownloadsProvider({
  children,
  recoverOnMount = true,
}: ReportDownloadsProviderProps) {
  const queryClient = useQueryClient();
  const [taskMap, setTaskMap] = useState<Map<string, ReportDownloadTask>>(new Map());
  const [isOpen, setIsOpen] = useState(false);
  const taskMapRef = useRef(taskMap);
  const pollingInFlightRef = useRef(false);
  const downloadingIdsRef = useRef(new Set<string>());
  const downloadControllersRef = useRef(new Map<string, AbortController>());
  const tasks = useMemo(() => Array.from(taskMap.values()), [taskMap]);
  const activeTaskCount = tasks.filter(isActiveTask).length;

  useEffect(() => {
    taskMapRef.current = taskMap;
  }, [taskMap]);

  const updateTask = useCallback((task: ReportDownloadTask) => {
    setTaskMap((current) => {
      const next = new Map(current);
      next.set(task.reportId, task);
      return next;
    });
  }, []);

  const removeTask = useCallback((reportId: string) => {
    setTaskMap((current) => {
      const next = new Map(current);
      next.delete(reportId);
      return next;
    });
  }, []);

  const downloadReadyReport = useCallback(
    async (report: ReportJob) => {
      if (downloadingIdsRef.current.has(report.id)) {
        return;
      }

      downloadingIdsRef.current.add(report.id);
      const controller = new AbortController();
      downloadControllersRef.current.set(report.id, controller);
      updateTask({ ...toDownloadTask(report), transferStatus: "preparing" });

      try {
        const download = await reportsApi.downloadReport(report.id, {
          signal: controller.signal,
          onProgress: (downloadedBytes, totalBytes) => {
            updateTask({
              ...toDownloadTask(report),
              downloadedBytes,
              totalBytes,
              transferStatus: "downloading",
            });
          },
        });
        downloadReportFile(
          download.blob,
          download.filename ?? report.downloadFilename ?? `${report.id}.zip`,
        );
        removeTask(report.id);
        toast.success(`ZIP de ${report.tenantName} descargado correctamente.`);
      } catch (error) {
        if (controller.signal.aborted) {
          updateTask({
            ...toDownloadTask(report),
            transferStatus: "cancelled",
            errorMessage: "Descarga cancelada.",
          });
          toast.info(`Descarga de ${report.tenantName} cancelada.`);
          return;
        }

        updateTask({
          ...toDownloadTask(report),
          errorMessage:
            error instanceof Error ? error.message : "No fue posible descargar el reporte.",
        });
        toast.error(
          error instanceof Error ? error.message : "No fue posible descargar el reporte.",
        );
      } finally {
        downloadingIdsRef.current.delete(report.id);
        downloadControllersRef.current.delete(report.id);
      }
    },
    [removeTask, updateTask],
  );

  const refreshReport = useCallback(
    async (reportId: string) => {
      try {
        const response = await reportsApi.getReport(reportId);
        updateTask(toDownloadTask(response.report));

        if (response.report.status === "ready") {
          await downloadReadyReport(response.report);
        }
      } catch (error) {
        const currentTask = taskMapRef.current.get(reportId);

        if (currentTask === undefined) {
          return;
        }

        updateTask({
          ...currentTask,
          errorMessage:
            error instanceof Error ? error.message : "No fue posible consultar el reporte.",
        });
      }
    },
    [downloadReadyReport, updateTask],
  );

  const pollActiveReports = useCallback(async () => {
    if (pollingInFlightRef.current) {
      return;
    }

    const activeReports = Array.from(taskMapRef.current.values()).filter(
      (task) => task.status === "pending" || task.status === "processing",
    );

    if (activeReports.length === 0) {
      return;
    }

    pollingInFlightRef.current = true;
    try {
      await Promise.all(activeReports.map((task) => refreshReport(task.reportId)));
    } finally {
      pollingInFlightRef.current = false;
    }
  }, [refreshReport]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void pollActiveReports();
    }, REPORT_POLL_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [pollActiveReports]);

  useEffect(() => {
    if (!recoverOnMount) {
      return;
    }

    let cancelled = false;
    void reportsApi
      .listReports({ type: null, period: null, tenantId: null })
      .then((response) => {
        if (cancelled) {
          return;
        }

        const activeReports = response.reports.filter(
          (report) => report.status === "pending" || report.status === "processing",
        );

        if (activeReports.length > 0) {
          setIsOpen(true);
          setTaskMap((current) => {
            const next = new Map(current);
            for (const report of activeReports) {
              next.set(report.id, toDownloadTask(report));
            }
            return next;
          });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [recoverOnMount]);

  useEffect(() => {
    if (activeTaskCount === 0 || isOpen) {
      toast.dismiss(REPORT_DOWNLOADS_TOAST_ID);
      return;
    }

    const activeTasks = tasks.filter(isActiveTask);
    const summary = activeTasks
      .slice(0, 3)
      .map((task) => `${task.tenantName} ${formatTaskProgress(task)}`)
      .join(" · ");
    const extraCount = activeTasks.length - Math.min(activeTasks.length, 3);

    toast(`Descargas en proceso · ${activeTaskCount}`, {
      id: REPORT_DOWNLOADS_TOAST_ID,
      description: `${summary}${extraCount > 0 ? ` · +${extraCount} más` : ""}`,
      duration: Infinity,
      action: {
        label: "Ver progreso",
        onClick: () => {
          setIsOpen(true);
        },
      },
    });
  }, [activeTaskCount, isOpen, tasks]);

  const value = useMemo<ReportDownloadsContextValue>(
    () => ({
      tasks,
      isOpen,
      openReportDownloads: () => setIsOpen(true),
      minimizeReportDownloads: () => setIsOpen(false),
      registerTask: (task) => {
        updateTask(task);
        setIsOpen(true);
      },
      registerReport: (report) => {
        updateTask(toDownloadTask(report));
        setIsOpen(true);
      },
      startReportDownload: (report) => {
        updateTask(toDownloadTask(report));
        setIsOpen(true);
        if (report.status === "ready") {
          void downloadReadyReport(report);
        }
      },
      cancelReport: async (reportId) => {
        const currentTask = taskMapRef.current.get(reportId);
        if (currentTask === undefined) {
          return;
        }

        const downloadController = downloadControllersRef.current.get(reportId);
        if (downloadController !== undefined) {
          downloadController.abort();
          return;
        }

        try {
          const response = await reportsApi.cancelReport(reportId);
          updateTask(toDownloadTask(response.report));
          await queryClient.invalidateQueries({ queryKey: ["reports"] });
          toast.info(`Reporte de ${response.report.tenantName} cancelado.`);
        } catch (error) {
          toast.error(
            error instanceof Error ? error.message : "No fue posible cancelar el reporte.",
          );
        }
      },
      removeTask,
    }),
    [downloadReadyReport, isOpen, queryClient, removeTask, tasks, updateTask],
  );

  return (
    <ReportDownloadsContext.Provider value={value}>{children}</ReportDownloadsContext.Provider>
  );
}

export function useReportDownloads(): ReportDownloadsContextValue {
  const context = useContext(ReportDownloadsContext);

  if (context === null) {
    throw new Error("useReportDownloads debe usarse dentro de ReportDownloadsProvider.");
  }

  return context;
}

function toDownloadTask(report: ReportJob): ReportDownloadTask {
  return {
    reportId: report.id,
    type: report.type,
    tenantName: report.tenantName,
    period: report.period,
    status: report.status,
    processedDocuments: report.processedDocuments,
    totalDocuments: report.totalDocuments,
    downloadedBytes: 0,
    totalBytes: null,
    transferStatus: "idle",
    errorMessage: report.message,
  };
}

function isActiveTask(task: ReportDownloadTask): boolean {
  return (
    task.status === "pending" ||
    task.status === "processing" ||
    (task.status === "ready" && task.transferStatus !== "cancelled")
  );
}

function formatTaskProgress(task: ReportDownloadTask): string {
  if (task.transferStatus === "preparing") {
    return "preparando";
  }

  if (task.transferStatus === "downloading") {
    if (task.totalBytes === null) {
      return "descargando";
    }

    return `${formatBytes(task.downloadedBytes)}/${formatBytes(task.totalBytes)}`;
  }

  if (task.status === "ready") {
    return "listo";
  }

  if (task.totalDocuments === null) {
    return `${task.processedDocuments} procesados`;
  }

  return `${task.processedDocuments}/${task.totalDocuments}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
