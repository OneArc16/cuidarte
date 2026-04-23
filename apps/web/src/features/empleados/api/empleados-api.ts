import {
  type CreateEmpleadoRequest,
  type EmpleadoDetailResponse,
  type EmpleadoListResponse,
  type EmpleadoTenantOptionsResponse,
  type UpdateEmpleadoRequest,
  empleadoDetailResponseSchema,
  empleadoListResponseSchema,
  empleadoTenantOptionsResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

type ListEmpleadosParams = {
  search: string;
};

export function listEmpleados(params: ListEmpleadosParams): Promise<EmpleadoListResponse> {
  return fetchJson(buildEmpleadosUrl(params.search), empleadoListResponseSchema);
}

export function listEmpleadoTenantOptions(): Promise<EmpleadoTenantOptionsResponse> {
  return fetchJson(`${getApiBaseUrl()}/empleados/tenant-options`, empleadoTenantOptionsResponseSchema);
}

export function getEmpleado(empleadoId: string): Promise<EmpleadoDetailResponse> {
  return fetchJson(`${getApiBaseUrl()}/empleados/${empleadoId}`, empleadoDetailResponseSchema);
}

export function createEmpleado(request: CreateEmpleadoRequest): Promise<EmpleadoDetailResponse> {
  return fetchJson(`${getApiBaseUrl()}/empleados`, empleadoDetailResponseSchema, {
    method: "POST",
    body: request,
  });
}

export function updateEmpleado(
  empleadoId: string,
  request: UpdateEmpleadoRequest,
): Promise<EmpleadoDetailResponse> {
  return fetchJson(`${getApiBaseUrl()}/empleados/${empleadoId}`, empleadoDetailResponseSchema, {
    method: "PATCH",
    body: request,
  });
}

function buildEmpleadosUrl(search: string): string {
  const searchParams = new URLSearchParams();

  if (search.trim() !== "") {
    searchParams.set("search", search.trim());
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/empleados${queryString === "" ? "" : `?${queryString}`}`;
}
