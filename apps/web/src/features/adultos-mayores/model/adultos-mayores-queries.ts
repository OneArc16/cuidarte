import { type CreateAdultoMayorRequest, type UpdateAdultoMayorRequest } from "@cuidarte/contracts";
import { type QueryClient, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as adultosMayoresApi from "../api/adultos-mayores-api";

export const adultosMayoresQueryKeys = {
  list: (params: { search: string }) => ["adultos-mayores", params] as const,
  detail: (adultoMayorId: string) => ["adultos-mayores", adultoMayorId] as const,
  tenantOptions: () => ["adultos-mayores", "tenant-options"] as const,
  trashList: (params: { search: string }) => ["adultos-mayores", "papelera", params] as const,
  statusHistory: (adultoMayorId: string) =>
    ["adultos-mayores", adultoMayorId, "status-history"] as const,
};

async function invalidateAdultoMayorDependencies(queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ["adultos-mayores"] }),
    queryClient.invalidateQueries({ queryKey: ["atenciones-enfermeria"] }),
    queryClient.invalidateQueries({ queryKey: ["atenciones-individuales"] }),
    queryClient.invalidateQueries({ queryKey: ["alimentacion"] }),
    queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
    queryClient.invalidateQueries({ queryKey: ["home"] }),
    queryClient.invalidateQueries({ queryKey: ["reports"] }),
  ]);
}

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

export function useAdultoMayorStatusHistoryQuery(adultoMayorId: string, enabled = true) {
  return useQuery({
    queryKey: adultosMayoresQueryKeys.statusHistory(adultoMayorId),
    queryFn: () => adultosMayoresApi.getAdultoMayorStatusHistory(adultoMayorId, { limit: 100 }),
    enabled,
    retry: false,
  });
}

export function useAdultosMayoresTrashQuery(params: { search: string }, enabled: boolean) {
  return useQuery({
    queryKey: adultosMayoresQueryKeys.trashList(params),
    queryFn: () => adultosMayoresApi.listAdultosMayoresTrash(params),
    enabled,
    retry: false,
  });
}

export function useSendAdultoMayorToTrashMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { adultoMayorId: string; reason: string }) =>
      adultosMayoresApi.sendAdultoMayorToTrash(request.adultoMayorId, request.reason),
    onSuccess: async (_, request) => {
      queryClient.removeQueries({
        queryKey: adultosMayoresQueryKeys.detail(request.adultoMayorId),
      });
      await invalidateAdultoMayorDependencies(queryClient);
    },
  });
}

export function useRestoreAdultoMayorMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (adultoMayorId: string) => adultosMayoresApi.restoreAdultoMayor(adultoMayorId),
    onSuccess: async () => {
      await invalidateAdultoMayorDependencies(queryClient);
    },
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

export function useUploadAdultoMayorDocumentMutation(adultoMayorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => adultosMayoresApi.uploadAdultoMayorDocument(adultoMayorId, file),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adultosMayoresQueryKeys.detail(adultoMayorId),
      });
    },
  });
}

export function useDeleteAdultoMayorDocumentMutation(adultoMayorId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => adultosMayoresApi.deleteAdultoMayorDocument(adultoMayorId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: adultosMayoresQueryKeys.detail(adultoMayorId),
      });
    },
  });
}
