import {
  type CreatePsicologiaSessionRequest,
  type PsicologiaAdultoListQuery,
  type PsicologiaAdultoListResponse,
  psicologiaAdultoListResponseSchema,
  type PsicologiaHistoryResponse,
  psicologiaHistoryResponseSchema,
} from "@cuidarte/contracts";
import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";
export function listPsicologiaAdultos(
  params: PsicologiaAdultoListQuery,
): Promise<PsicologiaAdultoListResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("search", params.search);
  return fetchJson(
    `${getApiBaseUrl()}/psicologia/adultos-mayores?${query}`,
    psicologiaAdultoListResponseSchema,
  );
}
export const getPsicologiaHistory = (id: string): Promise<PsicologiaHistoryResponse> =>
  fetchJson(
    `${getApiBaseUrl()}/psicologia/adultos-mayores/${id}/historial`,
    psicologiaHistoryResponseSchema,
  );
export const createPsicologiaSession = (
  request: CreatePsicologiaSessionRequest,
): Promise<PsicologiaHistoryResponse> =>
  fetchJson(`${getApiBaseUrl()}/psicologia/sesiones`, psicologiaHistoryResponseSchema, {
    method: "POST",
    body: request,
  });
