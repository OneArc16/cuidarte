import {
  type AtencionEnfermeriaDetail,
  type AtencionEnfermeriaHistoryResponse,
  type AtencionEnfermeriaLookupResponse,
  type AtencionEnfermeriaListQuery,
  type AtencionEnfermeriaListResponse,
  type CreateAtencionEnfermeriaRequest,
  atencionEnfermeriaListResponseSchema,
  atencionEnfermeriaHistoryResponseSchema,
  atencionEnfermeriaLookupResponseSchema,
  atencionEnfermeriaDetailSchema,
  type UpdateAtencionEnfermeriaRequest,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function listAtencionesEnfermeria(
  params: AtencionEnfermeriaListQuery,
): Promise<AtencionEnfermeriaListResponse> {
  const searchParams = new URLSearchParams();

  if (params.search !== null && params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  if (params.adultoMayorId !== null) {
    searchParams.set("adultoMayorId", params.adultoMayorId);
  }

  if (params.documentNumber !== null && params.documentNumber.trim() !== "") {
    searchParams.set("documentNumber", params.documentNumber.trim());
  }

  if (params.professionalUserId !== null) {
    searchParams.set("professionalUserId", params.professionalUserId);
  }

  if (params.attentionDate !== null) {
    searchParams.set("attentionDate", params.attentionDate);
  }

  const queryString = searchParams.toString();

  return fetchJson(
    `${getApiBaseUrl()}/atenciones-enfermeria${queryString === "" ? "" : `?${queryString}`}`,
    atencionEnfermeriaListResponseSchema,
  );
}

export function lookupAtencionEnfermeriaAdultoMayor(
  adultoMayorId: string,
): Promise<AtencionEnfermeriaLookupResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-enfermeria/adultos-mayores/${adultoMayorId}/lookup`,
    atencionEnfermeriaLookupResponseSchema,
  );
}

export function getAtencionesEnfermeriaHistory(
  adultoMayorId: string,
): Promise<AtencionEnfermeriaHistoryResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-enfermeria/adultos-mayores/${adultoMayorId}/history`,
    atencionEnfermeriaHistoryResponseSchema,
  );
}

export function getAtencionEnfermeria(atencionId: string): Promise<AtencionEnfermeriaDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-enfermeria/${atencionId}`,
    atencionEnfermeriaDetailSchema,
  );
}

export function createAtencionEnfermeria(
  request: CreateAtencionEnfermeriaRequest,
): Promise<AtencionEnfermeriaDetail> {
  return fetchJson(`${getApiBaseUrl()}/atenciones-enfermeria`, atencionEnfermeriaDetailSchema, {
    method: "POST",
    body: request,
  });
}

export function updateAtencionEnfermeria(
  atencionId: string,
  request: UpdateAtencionEnfermeriaRequest,
): Promise<AtencionEnfermeriaDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-enfermeria/${atencionId}`,
    atencionEnfermeriaDetailSchema,
    {
      method: "PATCH",
      body: request,
    },
  );
}
