import { useQuery } from "@tanstack/react-query";

import * as epsApi from "../api/eps-api";

export const epsQueryKeys = {
  list: () => ["eps", "list"] as const,
};

export function useEpsQuery() {
  return useQuery({
    queryKey: epsQueryKeys.list(),
    queryFn: () => epsApi.listEps(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}
