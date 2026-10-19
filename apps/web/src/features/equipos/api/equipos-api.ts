import {
  type CreateEquipoRequest,
  type EquipoOption,
  type EquiposListResponse,
  type UpdateEquipoRequest,
  equipoOptionSchema,
  equiposListResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function listEquipos(): Promise<EquiposListResponse> {
  return fetchJson(`${getApiBaseUrl()}/equipos`, equiposListResponseSchema);
}

export function createEquipo(request: CreateEquipoRequest): Promise<EquipoOption> {
  return fetchJson(`${getApiBaseUrl()}/equipos`, equipoOptionSchema, { method: "POST", body: request });
}

export function updateEquipo(id: string, request: UpdateEquipoRequest): Promise<EquipoOption> {
  return fetchJson(`${getApiBaseUrl()}/equipos/${id}`, equipoOptionSchema, {
    method: "PATCH",
    body: request,
  });
}
