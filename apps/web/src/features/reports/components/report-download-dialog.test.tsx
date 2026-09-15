import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import { type ReportJob } from "@cuidarte/contracts";
import { QueryClientProvider } from "@tanstack/react-query";

import { createQueryClient } from "@/app/query-client";
import * as reportsApi from "../api/reports-api";
Object.defineProperty(HTMLElement.prototype, "setPointerCapture", {
  configurable: true,
  value: () => undefined,
});

import {
  ReportDownloadsProvider,
  useReportDownloads,
  type ReportDownloadTask,
} from "../model/report-downloads-context";
import { ReportDownloadDialog } from "./report-download-dialog";

const northTask: ReportDownloadTask = {
  reportId: "report-north",
  type: "FORMATOS_ENTREGA_ALIMENTACION",
  tenantName: "Sede Norte",
  period: "2026-08",
  status: "processing",
  processedDocuments: 149,
  totalDocuments: 400,
  downloadedBytes: 0,
  totalBytes: null,
  transferStatus: "idle",
  errorMessage: null,
};

const centerTask: ReportDownloadTask = {
  reportId: "report-center",
  type: "ACTAS_SESIONES_GRUPALES",
  tenantName: "Sede Centro",
  period: "2026-08",
  status: "pending",
  processedDocuments: 0,
  totalDocuments: 210,
  downloadedBytes: 0,
  totalBytes: null,
  transferStatus: "idle",
  errorMessage: null,
};

function StaticTasks() {
  const { registerTask } = useReportDownloads();

  return (
    <button
      type="button"
      onClick={() => {
        registerTask(northTask);
        registerTask(centerTask);
      }}
    >
      Cargar descargas de prueba
    </button>
  );
}

function renderHarness(children: ReactNode = <StaticTasks />) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <ReportDownloadsProvider recoverOnMount={false}>
        {children}
        <ReportDownloadDialog />
        <Toaster />
      </ReportDownloadsProvider>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ReportDownloadDialog", () => {
  it("shows multiple report tasks with independent progress", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole("button", { name: "Cargar descargas de prueba" }));

    const dialog = screen.getByRole("dialog", { name: "Descargas de reportes" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Sede Norte/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Sede Centro/)).toBeInTheDocument();
    expect(screen.getByText("37%")).toBeInTheDocument();
    expect(screen.getByText("0%")).toBeInTheDocument();
  });

  it("minimizes the modal without removing its tasks and reopens it", async () => {
    const user = userEvent.setup();
    renderHarness();

    await user.click(screen.getByRole("button", { name: "Cargar descargas de prueba" }));
    await user.click(screen.getByRole("button", { name: "Minimizar descargas de reportes" }));

    expect(screen.queryByRole("dialog", { name: "Descargas de reportes" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver progreso" }));

    const dialog = screen.getByRole("dialog", { name: "Descargas de reportes" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Sede Norte/)).toBeInTheDocument();
  });

  it("removes only the selected task in the first-step harness", async () => {
    const user = userEvent.setup();
    vi.spyOn(reportsApi, "cancelReport").mockResolvedValue({
      report: {
        ...buildReport(centerTask),
        status: "cancelled",
        message: "Reporte cancelado.",
      },
    });
    renderHarness();

    await user.click(screen.getByRole("button", { name: "Cargar descargas de prueba" }));
    const cancelButtons = screen.getAllByRole("button", { name: "Cancelar" });

    await user.click(cancelButtons[0]!);

    const dialog = screen.getByRole("dialog", { name: "Descargas de reportes" });
    expect(within(dialog).getByText(/Sede Norte/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Sede Centro/)).toBeInTheDocument();
    expect(within(dialog).getByText("Cancelado")).toBeInTheDocument();
  });
});

function buildReport(task: ReportDownloadTask): ReportJob {
  return {
    id: task.reportId,
    type: task.type,
    status: task.status,
    period: task.period,
    tenantId: "00000000-0000-4000-8000-000000000001",
    tenantName: task.tenantName,
    requestedByUserId: "00000000-0000-4000-8000-000000000002",
    totalDocuments: task.totalDocuments,
    processedDocuments: task.processedDocuments,
    failedDocuments: 0,
    downloadFilename: `${task.reportId}.zip`,
    errorCode: null,
    message: null,
    downloadAvailable: task.status === "ready",
    expiresAt: null,
    startedAt: null,
    completedAt: null,
    createdAt: "2026-09-15T12:00:00.000Z",
    updatedAt: "2026-09-15T12:00:00.000Z",
  };
}
