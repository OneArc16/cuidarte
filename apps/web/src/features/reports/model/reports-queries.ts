import { type CreateReportRequest, type ReportType } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as reportsApi from "../api/reports-api";

export const reportsQueryKeys = {
  availability: (params: { type: ReportType; period: string; tenantId: string | null }) =>
    ["reports", "availability", params] as const,
  list: (params: { type: ReportType | null; period: string | null; tenantId: string | null }) =>
    ["reports", "list", params] as const,
};

export function useReportAvailabilityQuery(
  params: { type: ReportType; period: string; tenantId: string | null },
  enabled: boolean,
) {
  return useQuery({
    queryKey: reportsQueryKeys.availability(params),
    queryFn: () => reportsApi.getReportAvailability(params),
    enabled,
    retry: false,
  });
}

export function useReportsListQuery(params: {
  type: ReportType | null;
  period: string | null;
  tenantId: string | null;
}) {
  return useQuery({
    queryKey: reportsQueryKeys.list(params),
    queryFn: () => reportsApi.listReports(params),
    refetchInterval: (query) => {
      const reports = query.state.data?.reports ?? [];
      const hasActiveReport = reports.some(
        (report) => report.status === "pending" || report.status === "processing",
      );

      return hasActiveReport ? 3_000 : false;
    },
    retry: false,
  });
}

export function useCreateReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateReportRequest) => reportsApi.createReport(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}

export function useCancelReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reportId: string) => reportsApi.cancelReport(reportId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
