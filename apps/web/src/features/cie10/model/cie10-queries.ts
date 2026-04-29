import { useQuery } from "@tanstack/react-query";

import * as cie10Api from "../api/cie10-api";

export const cie10QueryKeys = {
  options: (search: string) => ["cie10", "options", search] as const,
};

export function useCie10OptionsQuery(search: string, enabled: boolean) {
  return useQuery({
    queryKey: cie10QueryKeys.options(search),
    queryFn: () => cie10Api.searchCie10Options(search),
    enabled,
    retry: false,
  });
}
