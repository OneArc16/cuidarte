import {
  type HomeDashboardResponse,
  homeDashboardResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function getHomeDashboard(): Promise<HomeDashboardResponse> {
  return fetchJson(`${getApiBaseUrl()}/home/dashboard`, homeDashboardResponseSchema);
}
