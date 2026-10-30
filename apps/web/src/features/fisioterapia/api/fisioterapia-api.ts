import {
  type CreateFisioterapiaSessionRequest,
  type FisioterapiaAdultoListQuery,
  type FisioterapiaAdultoListResponse,
  fisioterapiaAdultoListResponseSchema,
  type FisioterapiaHistoryResponse,
  fisioterapiaHistoryResponseSchema,
} from "@cuidarte/contracts";
import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";
export function listFisioterapiaAdultos(
  params: FisioterapiaAdultoListQuery,
): Promise<FisioterapiaAdultoListResponse> {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("search", params.search);
  return fetchJson(
    `${getApiBaseUrl()}/fisioterapia/adultos-mayores?${query}`,
    fisioterapiaAdultoListResponseSchema,
  );
}
export const getFisioterapiaHistory = (id: string): Promise<FisioterapiaHistoryResponse> =>
  fetchJson(
    `${getApiBaseUrl()}/fisioterapia/adultos-mayores/${id}/historial`,
    fisioterapiaHistoryResponseSchema,
  );
export const createFisioterapiaSession = (
  request: CreateFisioterapiaSessionRequest,
): Promise<FisioterapiaHistoryResponse> =>
  fetchJson(`${getApiBaseUrl()}/fisioterapia/sesiones`, fisioterapiaHistoryResponseSchema, {
    method: "POST",
    body: request,
  });
