import {
  type CancelReportResponse,
  type CreateReportRequest,
  type CreateReportResponse,
  type ReportAvailabilityResponse,
  type ReportListResponse,
  type ReportType,
  cancelReportResponseSchema,
  createReportResponseSchema,
  reportAvailabilityResponseSchema,
  reportListResponseSchema,
  reportStatusResponseSchema,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";
import { getApiBaseUrl } from "@/shared/api/api-config";
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

export async function downloadReport(reportId: string): Promise<DownloadReportFile> {
  const response = await fetch(`${getApiBaseUrl()}/reports/${reportId}/download`, {
    credentials: "include",
    headers: {
      Accept: "application/zip",
    },
  });

  if (!response.ok) {
    throw new ApiError(await resolveErrorMessage(response), response.status);
  }

  return {
    blob: await response.blob(),
    filename: parseContentDispositionFilename(response.headers.get("Content-Disposition")),
  };
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
