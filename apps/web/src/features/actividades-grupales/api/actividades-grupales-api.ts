import {
  type ActividadGrupalType,
  type ActividadGrupalFormOptionsResponse,
  type ActividadGrupalListResponse,
  type ActividadGrupalTenantOptionsResponse,
  type CreateActividadGrupalRequest,
  actividadGrupalFormOptionsResponseSchema,
  actividadGrupalListItemSchema,
  actividadGrupalListResponseSchema,
  actividadGrupalTenantOptionsResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

type ListActividadesGrupalesParams = {
  search: string;
  activityType: ActividadGrupalType | null;
  tenantId: string | null;
};

export function listActividadesGrupales(
  params: ListActividadesGrupalesParams,
): Promise<ActividadGrupalListResponse> {
  return fetchJson(buildActividadesGrupalesUrl(params), actividadGrupalListResponseSchema);
}

export function listActividadGrupalTenantOptions(): Promise<ActividadGrupalTenantOptionsResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/tenant-options`,
    actividadGrupalTenantOptionsResponseSchema,
  );
}

export function getActividadGrupalFormOptions(
  tenantId: string,
): Promise<ActividadGrupalFormOptionsResponse> {
  const searchParams = new URLSearchParams({ tenantId });

  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/form-options?${searchParams.toString()}`,
    actividadGrupalFormOptionsResponseSchema,
  );
}

export function createActividadGrupal(request: CreateActividadGrupalRequest) {
  return fetchJson(`${getApiBaseUrl()}/actividades-grupales`, actividadGrupalListItemSchema, {
    method: "POST",
    body: request,
  });
}

function buildActividadesGrupalesUrl(params: ListActividadesGrupalesParams): string {
  const searchParams = new URLSearchParams();

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.activityType !== null) {
    searchParams.set("activityType", params.activityType);
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/actividades-grupales${queryString === "" ? "" : `?${queryString}`}`;
}
