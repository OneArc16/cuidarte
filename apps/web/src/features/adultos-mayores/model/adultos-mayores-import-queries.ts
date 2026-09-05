import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as adultosMayoresImportApi from "../api/adultos-mayores-import-api";
import { homeQueryKeys } from "@/features/home/model/home-queries";

export const adultosMayoresImportQueryKeys = {
  detail: (importId: string) => ["adultos-mayores-import", importId] as const,
};

export function useAdultoMayorImportQuery(importId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: adultosMayoresImportQueryKeys.detail(importId ?? "none"),
    queryFn: () => {
      if (importId === null) {
        throw new Error("Importacion no seleccionada.");
      }

      return adultosMayoresImportApi.getAdultoMayorImport(importId);
    },
    enabled,
    retry: false,
  });
}

export function useValidateAdultoMayorImportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { file: File; tenantId: string | null }) =>
      adultosMayoresImportApi.validateAdultoMayorImport(request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(adultosMayoresImportQueryKeys.detail(detail.importId), detail);
    },
  });
}

export function useConfirmAdultoMayorImportMutation(importId: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => {
      if (importId === null) {
        throw new Error("Importacion no seleccionada.");
      }

      return adultosMayoresImportApi.confirmAdultoMayorImport(importId);
    },
    onSuccess: async (_, __, __context) => {
      if (importId !== null) {
        await queryClient.invalidateQueries({ queryKey: adultosMayoresImportQueryKeys.detail(importId) });
      }
      await queryClient.invalidateQueries({ queryKey: ["adultos-mayores"] });
      await queryClient.invalidateQueries({ queryKey: homeQueryKeys.dashboard });
    },
  });
}
