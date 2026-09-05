import {
  type AtencionIndividualDetail,
  type AtencionIndividualHistoryResponse,
  type AtencionIndividualLookupResponse,
  type CreateAtencionIndividualRequest,
  medicalAttentionHistoryResponseSchema,
  type UpdateAtencionIndividualRequest,
  atencionIndividualDetailSchema,
  atencionIndividualHistoryResponseSchema,
  atencionIndividualLookupResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export type CreateAtencionIndividualWithSupportsRequest = {
  payload: CreateAtencionIndividualRequest;
  supportFiles: File[];
};

export type UpdateAtencionIndividualWithSupportsRequest = {
  payload: UpdateAtencionIndividualRequest;
  supportFiles: File[];
  removedSupportFileIds: string[];
};

export function lookupAtencionIndividualAdultoMayor(
  adultoMayorId: string,
): Promise<AtencionIndividualLookupResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-individuales/adultos-mayores/${adultoMayorId}/lookup`,
    atencionIndividualLookupResponseSchema,
  );
}

export function getHistoriaClinica(
  adultoMayorId: string,
): Promise<AtencionIndividualHistoryResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-individuales/adultos-mayores/${adultoMayorId}/history`,
    atencionIndividualHistoryResponseSchema,
  );
}

export function getMedicalHistoriaClinica(
  adultoMayorId: string,
): Promise<AtencionIndividualHistoryResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-individuales/adultos-mayores/${adultoMayorId}/medical-history`,
    medicalAttentionHistoryResponseSchema,
  );
}

export function createAtencionIndividual(
  request: CreateAtencionIndividualWithSupportsRequest,
): Promise<AtencionIndividualDetail> {
  const formData = new FormData();

  formData.set("payload", JSON.stringify(request.payload));

  for (const file of request.supportFiles) {
    formData.append("supports", file, file.name);
  }

  return fetchJson(`${getApiBaseUrl()}/atenciones-individuales`, atencionIndividualDetailSchema, {
    method: "POST",
    body: formData,
  });
}

export function getAtencionIndividual(atencionId: string): Promise<AtencionIndividualDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/atenciones-individuales/${atencionId}`,
    atencionIndividualDetailSchema,
  );
}

export function updateAtencionIndividual(
  atencionId: string,
  request: UpdateAtencionIndividualWithSupportsRequest,
): Promise<AtencionIndividualDetail> {
  const formData = new FormData();

  formData.set(
    "payload",
    JSON.stringify({
      payload: request.payload,
      removedSupportFileIds: request.removedSupportFileIds,
    }),
  );

  for (const file of request.supportFiles) {
    formData.append("supports", file, file.name);
  }

  return fetchJson(
    `${getApiBaseUrl()}/atenciones-individuales/${atencionId}`,
    atencionIndividualDetailSchema,
    {
      method: "PATCH",
      body: formData,
    },
  );
}

export function buildAtencionIndividualSupportFileUrl(atencionId: string, fileId: string): string {
  return `${getApiBaseUrl()}/atenciones-individuales/${atencionId}/support-files/${fileId}`;
}
