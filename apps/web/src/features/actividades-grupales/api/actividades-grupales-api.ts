import {
  type ActividadGrupalEditDetail,
  type ActividadGrupalDiligenciamientoDetail,
  type DeleteActividadGrupalResponse,
  type ActividadGrupalFormOptionsResponse,
  type ActividadGrupalIntegranteOptionsResponse,
  type ActividadGrupalListResponse,
  type ActividadGrupalOrganizer,
  type ActividadGrupalTrashListResponse,
  type ActividadGrupalTenantOptionsResponse,
  type ActividadGrupalActaCorrectionPreviewResponse,
  type ApplyActividadGrupalActaCorrectionRequest,
  type ActividadGrupalActaPrefixCorrectionPreviewRequest,
  type ApplyActividadGrupalActaPrefixCorrectionRequest,
  type ApplyActividadGrupalActaCorrectionResponse,
  type CorrectActividadGrupalActaNumberRequest,
  type ActividadGrupalType,
  type CreateActividadGrupalRequest,
  type SaveActividadGrupalDiligenciamiento,
  type UpdateActividadGrupalRequest,
  actividadGrupalEditDetailSchema,
  actividadGrupalDiligenciamientoDetailSchema,
  actividadGrupalFormOptionsResponseSchema,
  actividadGrupalIntegranteOptionsResponseSchema,
  actividadGrupalListItemSchema,
  actividadGrupalListResponseSchema,
  actividadGrupalTrashListResponseSchema,
  actividadGrupalTenantOptionsResponseSchema,
  actividadGrupalActaCorrectionPreviewResponseSchema,
  actividadGrupalActaPrefixCorrectionPreviewRequestSchema,
  applyActividadGrupalActaPrefixCorrectionRequestSchema,
  applyActividadGrupalActaCorrectionResponseSchema,
  deleteActividadGrupalResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

type ListActividadesGrupalesParams = {
  search: string;
  activityType: ActividadGrupalType | null;
  activityTypeId: string | null;
  organizer: ActividadGrupalOrganizer | null;
  activityMonth: string | null;
  tenantId: string | null;
};

type TrashActividadesGrupalesParams = ListActividadesGrupalesParams;

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

export function listActividadesGrupalesTrash(
  params: TrashActividadesGrupalesParams,
): Promise<ActividadGrupalTrashListResponse> {
  return fetchJson(
    buildActividadesGrupalesTrashUrl(params),
    actividadGrupalTrashListResponseSchema,
  );
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

export function getActividadGrupalForEdit(activityId: string): Promise<ActividadGrupalEditDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}`,
    actividadGrupalEditDetailSchema,
  );
}

export function updateActividadGrupal(activityId: string, request: UpdateActividadGrupalRequest) {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}`,
    actividadGrupalListItemSchema,
    {
      method: "PUT",
      body: request,
    },
  );
}

export function correctActividadGrupalActaNumber(
  activityId: string,
  request: CorrectActividadGrupalActaNumberRequest,
) {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}/correct-acta-number`,
    actividadGrupalListItemSchema,
    { method: "POST", body: request },
  );
}

export function previewActividadGrupalActaPrefixCorrection(
  request: ActividadGrupalActaPrefixCorrectionPreviewRequest,
): Promise<ActividadGrupalActaCorrectionPreviewResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/acta-prefix-corrections/preview`,
    actividadGrupalActaCorrectionPreviewResponseSchema,
    {
      method: "POST",
      body: actividadGrupalActaPrefixCorrectionPreviewRequestSchema.parse(request),
    },
  );
}

export function applyActividadGrupalActaPrefixCorrection(
  request: ApplyActividadGrupalActaPrefixCorrectionRequest,
): Promise<ApplyActividadGrupalActaCorrectionResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/acta-prefix-corrections/apply`,
    applyActividadGrupalActaCorrectionResponseSchema,
    {
      method: "POST",
      body: applyActividadGrupalActaPrefixCorrectionRequestSchema.parse(request),
    },
  );
}

export function previewActividadGrupalActaCorrection(
  tenantId: string,
  organizer: ActividadGrupalOrganizer | null,
): Promise<ActividadGrupalActaCorrectionPreviewResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/acta-number-corrections/preview`,
    actividadGrupalActaCorrectionPreviewResponseSchema,
    { method: "POST", body: { tenantId, scope: "all", organizer } },
  );
}

export function applyActividadGrupalActaCorrection(
  request: ApplyActividadGrupalActaCorrectionRequest,
): Promise<ApplyActividadGrupalActaCorrectionResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/acta-number-corrections/apply`,
    applyActividadGrupalActaCorrectionResponseSchema,
    { method: "POST", body: request },
  );
}

export function deleteActividadGrupal(
  activityId: string,
  reason: string,
): Promise<DeleteActividadGrupalResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/actividades-grupales/${activityId}`,
    deleteActividadGrupalResponseSchema,
    {
      method: "DELETE",
      body: { reason },
    },
  );
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

export function buildActividadGrupalActaPdfUrl(activityId: string): string {
  return `${getApiBaseUrl()}/actividades-grupales/${activityId}/acta/pdf`;
}

function buildActividadesGrupalesUrl(params: ListActividadesGrupalesParams): string {
  const searchParams = new URLSearchParams();

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.activityType !== null) {
    searchParams.set("activityType", params.activityType);
  }

  if (params.activityTypeId !== null) {
    searchParams.set("activityTypeId", params.activityTypeId);
  }

  if (params.organizer !== null) {
    searchParams.set("organizer", params.organizer);
  }

  if (params.activityMonth !== null) {
    searchParams.set("activityMonth", params.activityMonth);
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/actividades-grupales${queryString === "" ? "" : `?${queryString}`}`;
}

function buildActividadesGrupalesTrashUrl(params: TrashActividadesGrupalesParams): string {
  const searchParams = new URLSearchParams();

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.activityType !== null) {
    searchParams.set("activityType", params.activityType);
  }

  if (params.activityTypeId !== null) {
    searchParams.set("activityTypeId", params.activityTypeId);
  }

  if (params.organizer !== null) {
    searchParams.set("organizer", params.organizer);
  }

  if (params.activityMonth !== null) {
    searchParams.set("activityMonth", params.activityMonth);
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/actividades-grupales/log-eliminaciones${queryString === "" ? "" : `?${queryString}`}`;
}
