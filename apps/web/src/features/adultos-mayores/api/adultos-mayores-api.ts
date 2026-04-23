import {
  type AdultoMayorDetailResponse,
  type AdultoMayorListResponse,
  type AdultoMayorTenantOptionsResponse,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
  adultoMayorDetailResponseSchema,
  adultoMayorListResponseSchema,
  adultoMayorTenantOptionsResponseSchema,
} from "@cuidarte/contracts";

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

export function getAdultoMayor(adultoMayorId: string): Promise<AdultoMayorDetailResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/${adultoMayorId}`,
    adultoMayorDetailResponseSchema,
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
