import {
  type Cie10OptionsResponse,
  cie10OptionsResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function searchCie10Options(search: string): Promise<Cie10OptionsResponse> {
  const searchParams = new URLSearchParams({
    search,
  });

  return fetchJson(
    `${getApiBaseUrl()}/cie10/options?${searchParams.toString()}`,
    cie10OptionsResponseSchema,
  );
}
