import { type BackofficeTenantDetailResponse } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as tenantBrandingApi from "../api/tenant-branding-api";
import { backofficeQueryKeys } from "./backoffice-queries";

export const tenantBrandingQueryKeys = {
  preview: (tenantId: string, versionId: string) =>
    ["backoffice", "tenants", tenantId, "logo", versionId] as const,
};

export function useTenantLogoPreviewQuery(tenantId: string, versionId: string | null) {
  return useQuery({
    queryKey:
      versionId === null
        ? ["backoffice", "tenants", tenantId, "logo", "empty"]
        : tenantBrandingQueryKeys.preview(tenantId, versionId),
    queryFn: () => tenantBrandingApi.getTenantLogoFile(tenantId),
    enabled: versionId !== null,
    retry: false,
  });
}

export function useUploadTenantLogoMutation(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => tenantBrandingApi.uploadTenantLogo(tenantId, file),
    onSuccess: (logo) => {
      queryClient.setQueryData<BackofficeTenantDetailResponse>(
        backofficeQueryKeys.tenant(tenantId),
        (current) => (current === undefined ? current : { ...current, logo }),
      );
    },
  });
}

export function useRemoveTenantLogoMutation(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => tenantBrandingApi.removeTenantLogo(tenantId),
    onSuccess: () => {
      queryClient.setQueryData<BackofficeTenantDetailResponse>(
        backofficeQueryKeys.tenant(tenantId),
        (current) => (current === undefined ? current : { ...current, logo: null }),
      );
      queryClient.removeQueries({
        queryKey: ["backoffice", "tenants", tenantId, "logo"],
      });
    },
  });
}
