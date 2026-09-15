import {
  type CancelReportResponse,
  type CreateReportRequest,
  type CreateReportResponse,
  type ReportAvailabilityResponse,
  type ReportListResponse,
  type ReportsDashboardResponse,
  type ReportAnalyticsExportFormat,
  type ReportType,
  cancelReportResponseSchema,
  createReportResponseSchema,
  reportAvailabilityResponseSchema,
  reportListResponseSchema,
  reportsDashboardResponseSchema,
  reportsDashboardExportResponseSchema,
  reportsDashboardExportListResponseSchema,
  reportStatusResponseSchema,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";
import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchBlob } from "@/shared/api/fetch-blob";
import { fetchJson } from "@/shared/api/fetch-json";

export function getReportAvailability(params: {
  type: ReportType;
  period: string;
  tenantId: string | null;
}): Promise<ReportAvailabilityResponse> {
  const searchParams = new URLSearchParams({
    type: params.type,
    period: params.period,
  });

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  return fetchJson(
    `${getApiBaseUrl()}/reports/availability?${searchParams.toString()}`,
    reportAvailabilityResponseSchema,
  );
}

export function listReports(params: {
  type: ReportType | null;
  period: string | null;
  tenantId: string | null;
}): Promise<ReportListResponse> {
  const searchParams = new URLSearchParams();

  if (params.type !== null) {
    searchParams.set("type", params.type);
  }

  if (params.period !== null) {
    searchParams.set("period", params.period);
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  const queryString = searchParams.toString();

  return fetchJson(
    `${getApiBaseUrl()}/reports${queryString === "" ? "" : `?${queryString}`}`,
    reportListResponseSchema,
  );
}

export function getReportsDashboard(params: {
  from: string;
  to: string;
}): Promise<ReportsDashboardResponse> {
  const searchParams = new URLSearchParams({ from: params.from, to: params.to });
  return fetchJson(
    `${getApiBaseUrl()}/reports/dashboard?${searchParams.toString()}`,
    reportsDashboardResponseSchema,
  );
}

export function exportReportsDashboardExcel(params: { from: string; to: string }): Promise<Blob> {
  const searchParams = new URLSearchParams({ from: params.from, to: params.to });
  return fetchBlob(`${getApiBaseUrl()}/reports/dashboard.xlsx?${searchParams.toString()}`);
}

export function exportReportsDashboardFile(
  format: "pdf" | "pptx",
  params: { from: string; to: string },
): Promise<Blob> {
  const searchParams = new URLSearchParams({ from: params.from, to: params.to });
  return fetchBlob(`${getApiBaseUrl()}/reports/dashboard.${format}?${searchParams.toString()}`);
}

export function createReportsDashboardExport(request: { from: string; to: string; format: ReportAnalyticsExportFormat }) {
  return fetchJson(`${getApiBaseUrl()}/reports/exports`, reportsDashboardExportResponseSchema, { method: "POST", body: request });
}

export function listReportsDashboardExports() {
  return fetchJson(`${getApiBaseUrl()}/reports/exports`, reportsDashboardExportListResponseSchema);
}

export function getReportsDashboardExport(exportId: string) {
  return fetchJson(`${getApiBaseUrl()}/reports/exports/${exportId}`, reportsDashboardExportResponseSchema);
}

export function cancelReportsDashboardExport(exportId: string) {
  return fetchJson(`${getApiBaseUrl()}/reports/exports/${exportId}/cancel`, reportsDashboardExportResponseSchema, { method: "POST" });
}

export function downloadReportsDashboardExport(exportId: string, options: DownloadReportOptions = {}) {
  return downloadFile(`${getApiBaseUrl()}/reports/exports/${exportId}/download`, options);
}

export function createReport(request: CreateReportRequest): Promise<CreateReportResponse> {
  return fetchJson(`${getApiBaseUrl()}/reports`, createReportResponseSchema, {
    method: "POST",
    body: request,
  });
}

export function getReport(reportId: string) {
  return fetchJson(`${getApiBaseUrl()}/reports/${reportId}`, reportStatusResponseSchema);
}

export function cancelReport(reportId: string): Promise<CancelReportResponse> {
  return fetchJson(`${getApiBaseUrl()}/reports/${reportId}/cancel`, cancelReportResponseSchema, {
    method: "POST",
  });
}

export type DownloadReportFile = {
  blob: Blob;
  filename: string | null;
};

export type DownloadReportOptions = {
  signal?: AbortSignal;
  onProgress?: (downloadedBytes: number, totalBytes: number | null) => void;
};

export async function downloadReport(
  reportId: string,
  options: DownloadReportOptions = {},
): Promise<DownloadReportFile> {
  return downloadFile(`${getApiBaseUrl()}/reports/${reportId}/download`, options);
}

async function downloadFile(url: string, options: DownloadReportOptions = {}): Promise<DownloadReportFile> {
  const requestInit: RequestInit = { credentials: "include" };
  if (options.signal !== undefined) requestInit.signal = options.signal;
  const response = await fetch(url, requestInit);

  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }

  const filename = parseContentDispositionFilename(response.headers.get("Content-Disposition"));
  const totalBytes = parseContentLength(response.headers.get("Content-Length"));

  if (response.body === null) {
    return {
      blob: await response.blob(),
      filename,
    };
  }

  const reader = response.body.getReader();
  const chunks: ArrayBuffer[] = [];
  let downloadedBytes = 0;

  options.onProgress?.(downloadedBytes, totalBytes);

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    if (value !== undefined) {
      chunks.push(value.slice().buffer as ArrayBuffer);
      downloadedBytes += value.byteLength;
      options.onProgress?.(downloadedBytes, totalBytes);
    }
  }

  return {
    blob: new Blob(chunks, {
      type: response.headers.get("Content-Type") ?? "application/zip",
    }),
    filename,
  };
}

function parseContentLength(value: string | null): number | null {
  if (value === null) {
    return null;
  }

  const length = Number(value);
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

function parseContentDispositionFilename(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const encodedFilename = /filename\*=UTF-8''([^;]+)/i.exec(value)?.[1];

  if (encodedFilename !== undefined) {
    try {
      return decodeURIComponent(encodedFilename);
    } catch {
      return encodedFilename;
    }
  }

  const quotedFilename = /filename="([^"]+)"/i.exec(value)?.[1];

  if (quotedFilename !== undefined) {
    return quotedFilename;
  }

  return /filename=([^;]+)/i.exec(value)?.[1]?.trim() ?? null;
}

async function resolveErrorMessage(response: Response): Promise<string> {
  try {
    const data: unknown = await response.json();

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      Array.isArray(data.message)
    ) {
      return data.message.join(" ");
    }
  } catch {
    return "No fue posible completar la descarga.";
  }

  return "No fue posible completar la descarga.";
}
