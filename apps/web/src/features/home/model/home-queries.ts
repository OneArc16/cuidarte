import { useQuery } from "@tanstack/react-query";

import * as homeApi from "../api/home-api";

export const homeQueryKeys = {
  dashboard: ["home", "dashboard"] as const,
};

export function useHomeDashboardQuery() {
  return useQuery({
    queryKey: homeQueryKeys.dashboard,
    queryFn: homeApi.getHomeDashboard,
    retry: false,
  });
}
