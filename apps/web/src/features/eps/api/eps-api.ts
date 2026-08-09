import { epsListResponseSchema, type EpsListResponse } from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function listEps(): Promise<EpsListResponse> {
  return fetchJson(`${getApiBaseUrl()}/eps`, epsListResponseSchema);
}
