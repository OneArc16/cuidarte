import {
  type CreateBackofficeTenantRequest,
  type TenantStatusFilter,
  type UpdateBackofficeTenantRequest,
} from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as backofficeApi from "../api/backoffice-api";

export const backofficeQueryKeys = {
  tenants: (params: { search: string; status: TenantStatusFilter }) =>
    ["backoffice", "tenants", params] as const,
  tenant: (tenantId: string) => ["backoffice", "tenants", tenantId] as const,
};

export function useBackofficeTenantsQuery(params: {
  search: string;
  status: TenantStatusFilter;
}) {
  return useQuery({
    queryKey: backofficeQueryKeys.tenants(params),
    queryFn: () => backofficeApi.listTenants(params),
    retry: false,
  });
}

export function useBackofficeTenantQuery(tenantId: string) {
  return useQuery({
    queryKey: backofficeQueryKeys.tenant(tenantId),
    queryFn: () => backofficeApi.getTenant(tenantId),
    retry: false,
  });
}

export function useCreateBackofficeTenantMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateBackofficeTenantRequest) => backofficeApi.createTenant(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["backoffice", "tenants"] });
    },
  });
}

export function useUpdateBackofficeTenantMutation(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateBackofficeTenantRequest) =>
      backofficeApi.updateTenant(tenantId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(backofficeQueryKeys.tenant(tenantId), detail);
      await queryClient.invalidateQueries({ queryKey: ["backoffice", "tenants"] });
    },
  });
}
