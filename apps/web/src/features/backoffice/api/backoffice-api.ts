import {
  type BackofficeTenantDetailResponse,
  type BackofficeTenantListResponse,
  type CreateBackofficeTenantRequest,
  type TenantStatusFilter,
  type UpdateBackofficeTenantRequest,
  backofficeTenantDetailResponseSchema,
  backofficeTenantListResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "../../../shared/api/api-config";
import { fetchJson } from "../../../shared/api/fetch-json";

type ListTenantsParams = {
  search: string;
  status: TenantStatusFilter;
};

export function listTenants(params: ListTenantsParams): Promise<BackofficeTenantListResponse> {
  const searchParams = new URLSearchParams();

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.status !== "all") {
    searchParams.set("status", params.status);
  }

  const queryString = searchParams.toString();
  const url = `${getApiBaseUrl()}/backoffice/tenants${queryString === "" ? "" : `?${queryString}`}`;

  return fetchJson(url, backofficeTenantListResponseSchema);
}

export function getTenant(tenantId: string): Promise<BackofficeTenantDetailResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/backoffice/tenants/${tenantId}`,
    backofficeTenantDetailResponseSchema,
  );
}

export function createTenant(
  request: CreateBackofficeTenantRequest,
): Promise<BackofficeTenantDetailResponse> {
  return fetchJson(`${getApiBaseUrl()}/backoffice/tenants`, backofficeTenantDetailResponseSchema, {
    method: "POST",
    body: request,
  });
}

export function updateTenant(
  tenantId: string,
  request: UpdateBackofficeTenantRequest,
): Promise<BackofficeTenantDetailResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/backoffice/tenants/${tenantId}`,
    backofficeTenantDetailResponseSchema,
    {
      method: "PATCH",
      body: request,
    },
  );
}
