import {
  type ActividadGrupalDiligenciamientoDetail,
  type ActividadGrupalFormOptionsResponse,
  type ActividadGrupalIntegranteOptionsResponse,
  type ActividadGrupalListResponse,
  type ActividadGrupalTenantOptionsResponse,
  type ActividadGrupalType,
  type CreateActividadGrupalRequest,
  type SaveActividadGrupalDiligenciamiento,
  actividadGrupalDiligenciamientoDetailSchema,
  actividadGrupalFormOptionsResponseSchema,
  actividadGrupalIntegranteOptionsResponseSchema,
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

type SaveActividadGrupalDiligenciamientoRequest = {
  payload: SaveActividadGrupalDiligenciamiento;
  newPhotos: File[];
  newPdf: File | null;
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

export function getActividadGrupalDiligenciamiento(
  activityId: string,
): Promise<ActividadGrupalDiligenciamientoDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}/diligenciamiento`,
    actividadGrupalDiligenciamientoDetailSchema,
  );
}

export function searchActividadGrupalIntegranteOptions(
  activityId: string,
  search: string,
): Promise<ActividadGrupalIntegranteOptionsResponse> {
  const searchParams = new URLSearchParams();

  if (search.trim() !== "") {
    searchParams.set("search", search.trim());
  }

  const queryString = searchParams.toString();

  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}/diligenciamiento/integrantes-options${queryString === "" ? "" : `?${queryString}`}`,
    actividadGrupalIntegranteOptionsResponseSchema,
  );
}

export async function saveActividadGrupalDiligenciamiento(
  activityId: string,
  request: SaveActividadGrupalDiligenciamientoRequest,
): Promise<ActividadGrupalDiligenciamientoDetail> {
  const formData = new FormData();

  formData.set("payload", JSON.stringify(request.payload));

  for (const photo of request.newPhotos) {
    formData.append("photos", await toMultipartBlob(photo), photo.name);
  }

  if (request.newPdf !== null) {
    formData.set("pdf", await toMultipartBlob(request.newPdf), request.newPdf.name);
  }

  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}/diligenciamiento`,
    actividadGrupalDiligenciamientoDetailSchema,
    {
      method: "PUT",
      body: formData,
    },
  );
}

async function toMultipartBlob(file: File): Promise<Blob> {
  return new Blob([await file.arrayBuffer()], {
    type: file.type === "" ? "application/octet-stream" : file.type,
  });
}

export function buildActividadGrupalDiligenciamientoFileUrl(
  activityId: string,
  fileId: string,
): string {
  return `${getApiBaseUrl()}/actividades-grupales/${activityId}/diligenciamiento/files/${fileId}`;
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
