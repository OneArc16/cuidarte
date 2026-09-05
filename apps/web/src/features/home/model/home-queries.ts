import { useQuery } from "@tanstack/react-query";

import * as homeApi from "../api/home-api";

const HOME_DASHBOARD_REFETCH_INTERVAL_MS = 15_000;

export const homeQueryKeys = {
  dashboard: ["home", "dashboard"] as const,
};

export function useHomeDashboardQuery() {
  return useQuery({
    queryKey: homeQueryKeys.dashboard,
    queryFn: homeApi.getHomeDashboard,
    refetchInterval: HOME_DASHBOARD_REFETCH_INTERVAL_MS,
    staleTime: 0,
    refetchOnMount: "always",
    refetchOnReconnect: true,
    refetchOnWindowFocus: "always",
    retry: false,
  });
}
