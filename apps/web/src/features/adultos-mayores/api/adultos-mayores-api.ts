import {
  type AdultoMayorDetailResponse,
  type AdultoMayorListResponse,
  type AdultoMayorTenantOptionsResponse,
  type AdultoMayorTrashListResponse,
  type AdultoMayorTrashMutationResponse,
  type AdultoMayorStatusHistoryResponse,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
  adultoMayorDocumentResponseSchema,
  adultoMayorDetailResponseSchema,
  adultoMayorListResponseSchema,
  adultoMayorTenantOptionsResponseSchema,
  adultoMayorTrashListResponseSchema,
  adultoMayorTrashMutationResponseSchema,
  adultoMayorStatusHistoryResponseSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchBlob } from "@/shared/api/fetch-blob";
import { fetchJson } from "@/shared/api/fetch-json";

type ListAdultosMayoresParams = {
  search: string;
};

export function listAdultosMayores(
  params: ListAdultosMayoresParams,
): Promise<AdultoMayorListResponse> {
  return fetchJson(buildAdultosMayoresUrl(params.search), adultoMayorListResponseSchema);
}

export function listAdultoMayorTenantOptions(): Promise<AdultoMayorTenantOptionsResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/tenant-options`,
    adultoMayorTenantOptionsResponseSchema,
  );
}

export function listAdultosMayoresTrash(
  params: ListAdultosMayoresParams,
): Promise<AdultoMayorTrashListResponse> {
  return fetchJson(
    buildAdultosMayoresUrl(params.search, "/trash"),
    adultoMayorTrashListResponseSchema,
  );
}

export function sendAdultoMayorToTrash(
  adultoMayorId: string,
  reason: string,
): Promise<AdultoMayorTrashMutationResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}`,
    adultoMayorTrashMutationResponseSchema,
    { method: "DELETE", body: { reason } },
  );
}

export function restoreAdultoMayor(
  adultoMayorId: string,
): Promise<AdultoMayorTrashMutationResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}/restore`,
    adultoMayorTrashMutationResponseSchema,
    { method: "POST" },
  );
}

export function getAdultoMayor(adultoMayorId: string): Promise<AdultoMayorDetailResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}`,
    adultoMayorDetailResponseSchema,
  );
}

export function getAdultoMayorStatusHistory(
  adultoMayorId: string,
  params: { cursor?: string | null; limit?: number } = {},
): Promise<AdultoMayorStatusHistoryResponse> {
  const searchParams = new URLSearchParams();
  if (params.cursor) searchParams.set("cursor", params.cursor);
  if (params.limit) searchParams.set("limit", String(params.limit));
  const query = searchParams.toString();

  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}/historial-estados${query ? `?${query}` : ""}`,
    adultoMayorStatusHistoryResponseSchema,
  );
}

export function createAdultoMayor(
  request: CreateAdultoMayorRequest,
): Promise<AdultoMayorDetailResponse> {
  return fetchJson(`${getApiBaseUrl()}/adultos-mayores`, adultoMayorDetailResponseSchema, {
    method: "POST",
    body: request,
  });
}

export function updateAdultoMayor(
  adultoMayorId: string,
  request: UpdateAdultoMayorRequest,
): Promise<AdultoMayorDetailResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}`,
    adultoMayorDetailResponseSchema,
    {
      method: "PATCH",
      body: request,
    },
  );
}

export function uploadAdultoMayorDocument(adultoMayorId: string, file: File) {
  const formData = new FormData();
  formData.append("document", file, file.name);

  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}/document`,
    adultoMayorDocumentResponseSchema,
    { method: "POST", body: formData },
  );
}

export function deleteAdultoMayorDocument(adultoMayorId: string): Promise<{ success: boolean }> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}/document`,
    z.object({ success: z.boolean() }),
    {
      method: "DELETE",
    },
  );
}

export function getAdultoMayorDocumentUrl(adultoMayorId: string): string {
  return `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}/document`;
}

export function exportAdultosMayoresExcel(search: string): Promise<Blob> {
  return fetchBlob(buildAdultosMayoresUrl(search, "/export/excel"));
}

export function exportAdultosMayoresPdf(search: string): Promise<Blob> {
  return fetchBlob(buildAdultosMayoresUrl(search, "/export/pdf"));
}

function buildAdultosMayoresUrl(search: string, suffix = ""): string {
  const searchParams = new URLSearchParams();

  if (search.trim() !== "") {
    searchParams.set("search", search.trim());
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/adultos-mayores${suffix}${queryString === "" ? "" : `?${queryString}`}`;
}
