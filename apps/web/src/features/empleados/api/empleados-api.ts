import {
  type AssignEmpleadoDirectorSignatureRequest,
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
import { fetchBlob } from "@/shared/api/fetch-blob";
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

export async function uploadEmpleadoSignature(
  empleadoId: string,
  file: File,
): Promise<EmpleadoDetailResponse> {
  const formData = new FormData();
  formData.set("signature", await toMultipartBlob(file), file.name);

  return fetchJson(`${getApiBaseUrl()}/empleados/${empleadoId}/signature`, empleadoDetailResponseSchema, {
    method: "POST",
    body: formData,
  });
}

export function assignEmpleadoDirectorSignature(
  empleadoId: string,
  request: AssignEmpleadoDirectorSignatureRequest,
): Promise<EmpleadoDetailResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/empleados/${empleadoId}/director-signature-assignment`,
    empleadoDetailResponseSchema,
    {
      method: "POST",
      body: request,
    },
  );
}

export function getEmpleadoSignatureFile(empleadoId: string): Promise<Blob> {
  return fetchBlob(`${getApiBaseUrl()}/empleados/${empleadoId}/signature/file`);
}

async function toMultipartBlob(file: File): Promise<Blob> {
  return new Blob([await file.arrayBuffer()], {
    type: file.type === "" ? "application/octet-stream" : file.type,
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
