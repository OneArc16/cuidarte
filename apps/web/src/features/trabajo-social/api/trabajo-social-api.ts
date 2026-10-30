import {
  type CreateTrabajoSocialSessionRequest,
  type TrabajoSocialAdultoListQuery,
  trabajoSocialAdultoListResponseSchema,
  type TrabajoSocialHistoryResponse,
  trabajoSocialHistoryResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function listTrabajoSocialAdultos(params: TrabajoSocialAdultoListQuery) {
  const query = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });
  if (params.search) query.set("search", params.search);
  return fetchJson(
    `${getApiBaseUrl()}/trabajo-social/adultos-mayores?${query}`,
    trabajoSocialAdultoListResponseSchema,
  );
}
export const getTrabajoSocialHistory = (id: string): Promise<TrabajoSocialHistoryResponse> =>
  fetchJson(
    `${getApiBaseUrl()}/trabajo-social/adultos-mayores/${id}/historial`,
    trabajoSocialHistoryResponseSchema,
  );
export const createTrabajoSocialSession = (request: CreateTrabajoSocialSessionRequest) =>
  fetchJson(`${getApiBaseUrl()}/trabajo-social/sesiones`, trabajoSocialHistoryResponseSchema, {
    method: "POST",
    body: request,
  });
