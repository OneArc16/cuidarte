import { type CreateAdultoMayorRequest, type UpdateAdultoMayorRequest } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as adultosMayoresApi from "../api/adultos-mayores-api";

export const adultosMayoresQueryKeys = {
  list: (params: { search: string }) => ["adultos-mayores", params] as const,
  detail: (adultoMayorId: string) => ["adultos-mayores", adultoMayorId] as const,
  tenantOptions: () => ["adultos-mayores", "tenant-options"] as const,
};

export function useAdultosMayoresQuery(params: { search: string }) {
  return useQuery({
    queryKey: adultosMayoresQueryKeys.list(params),
    queryFn: () => adultosMayoresApi.listAdultosMayores(params),
    retry: false,
  });
}

export function useAdultoMayorTenantOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: adultosMayoresQueryKeys.tenantOptions(),
    queryFn: () => adultosMayoresApi.listAdultoMayorTenantOptions(),
    enabled,
    retry: false,
  });
}

export function useAdultoMayorQuery(adultoMayorId: string) {
  return useQuery({
    queryKey: adultosMayoresQueryKeys.detail(adultoMayorId),
    queryFn: () => adultosMayoresApi.getAdultoMayor(adultoMayorId),
    retry: false,
  });
}

export function useCreateAdultoMayorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAdultoMayorRequest) => adultosMayoresApi.createAdultoMayor(request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(adultosMayoresQueryKeys.detail(detail.id), detail);
      await queryClient.invalidateQueries({ queryKey: ["adultos-mayores"] });
    },
  });
}

export function useUpdateAdultoMayorMutation(adultoMayorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateAdultoMayorRequest) =>
      adultosMayoresApi.updateAdultoMayor(adultoMayorId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(adultosMayoresQueryKeys.detail(adultoMayorId), detail);
      await queryClient.invalidateQueries({ queryKey: ["adultos-mayores"] });
    },
  });
}
