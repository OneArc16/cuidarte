import {
  type CreateAlimentacionBatchRequest,
  type AlimentacionImportedFormatoUploadResponse,
  type UpdateAlimentacionRequest,
} from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as alimentacionApi from "../api/alimentacion-api";

export const alimentacionQueryKeys = {
  list: (params: { search: string; deliveryMonth: string | null; tenantId: string | null }) =>
    ["alimentacion", params] as const,
  detail: (recordId: string) => ["alimentacion", recordId] as const,
  tenantOptions: () => ["alimentacion", "tenant-options"] as const,
  adultoOptions: (params: { search: string; deliveryDate: string; tenantId: string | null }) =>
    ["alimentacion", "adultos-mayores-options", params] as const,
  adultoLookup: (adultoMayorId: string, deliveryDate: string) =>
    ["alimentacion", "adulto-lookup", adultoMayorId, deliveryDate] as const,
  importedVersions: (adultoMayorId: string, deliveryMonth: string) =>
    ["alimentacion", "imported-formato-versions", adultoMayorId, deliveryMonth] as const,
};

export function useAlimentacionListQuery(params: {
  search: string;
  deliveryMonth: string | null;
  tenantId: string | null;
}) {
  return useQuery({
    queryKey: alimentacionQueryKeys.list(params),
    queryFn: () => alimentacionApi.listRegistrosAlimentacion(params),
    retry: false,
  });
}

export function useAlimentacionTenantOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: alimentacionQueryKeys.tenantOptions(),
    queryFn: () => alimentacionApi.listAlimentacionTenantOptions(),
    enabled,
    retry: false,
  });
}

export function useAlimentacionAdultosMayoresOptionsQuery(
  params: {
    search: string;
    deliveryDate: string;
    tenantId: string | null;
  },
  enabled: boolean,
) {
  return useQuery({
    queryKey: alimentacionQueryKeys.adultoOptions(params),
    queryFn: () => alimentacionApi.searchAlimentacionAdultosMayoresOptions(params),
    enabled,
    retry: false,
  });
}

export function useAlimentacionAdultoMayorLookupQuery(
  adultoMayorId: string | null,
  deliveryDate: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: alimentacionQueryKeys.adultoLookup(adultoMayorId ?? "none", deliveryDate),
    queryFn: () => {
      if (adultoMayorId === null) {
        throw new Error("Adulto mayor no seleccionado.");
      }

      return alimentacionApi.lookupAlimentacionAdultoMayorByDate(adultoMayorId, deliveryDate);
    },
    enabled,
    retry: false,
  });
}

export function useAlimentacionRecordQuery(recordId: string) {
  return useQuery({
    queryKey: alimentacionQueryKeys.detail(recordId),
    queryFn: () => alimentacionApi.getAlimentacionRecord(recordId),
    retry: false,
  });
}

export function useCreateAlimentacionBatchMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateAlimentacionBatchRequest) =>
      alimentacionApi.createAlimentacionBatch(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["alimentacion"] });
    },
  });
}

export function useUpdateAlimentacionRecordMutation(recordId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateAlimentacionRequest) =>
      alimentacionApi.updateAlimentacionRecord(recordId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(alimentacionQueryKeys.detail(recordId), detail);
      await queryClient.invalidateQueries({ queryKey: ["alimentacion"] });
    },
  });
}

export function useDeleteAlimentacionRecordMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (recordId: string) => alimentacionApi.deleteAlimentacionRecord(recordId),
    onSuccess: async (_response, recordId: string) => {
      queryClient.setQueriesData({ queryKey: ["alimentacion"] }, (current) => {
        if (
          current !== null &&
          typeof current === "object" &&
          "registros" in current &&
          Array.isArray(current.registros)
        ) {
          return {
            ...current,
            registros: current.registros.filter(
              (registro: { id?: string }) => registro.id !== recordId,
            ),
          };
        }

        return current;
      });
      queryClient.removeQueries({
        queryKey: alimentacionQueryKeys.detail(recordId),
      });

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alimentacion"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useAlimentacionImportedFormatoVersionsQuery(
  adultoMayorId: string | null,
  deliveryMonth: string | null,
  enabled: boolean,
) {
  return useQuery({
    queryKey: alimentacionQueryKeys.importedVersions(
      adultoMayorId ?? "none",
      deliveryMonth ?? "none",
    ),
    queryFn: () => {
      if (adultoMayorId === null || deliveryMonth === null) {
        throw new Error("Selecciona un beneficiario y mes para consultar las versiones.");
      }

      return alimentacionApi.listAlimentacionImportedFormatoVersions({
        adultoMayorId,
        deliveryMonth,
      });
    },
    enabled,
    retry: false,
  });
}

export function useImportAlimentacionFormatoEntregaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { adultoMayorId: string; deliveryMonth: string; file: File }) =>
      alimentacionApi.importAlimentacionFormatoEntregaPdf(request),
    onSuccess: async (
      _response: AlimentacionImportedFormatoUploadResponse,
      request: { adultoMayorId: string; deliveryMonth: string; file: File },
    ) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["alimentacion"] }),
        queryClient.invalidateQueries({
          queryKey: alimentacionQueryKeys.importedVersions(
            request.adultoMayorId,
            request.deliveryMonth,
          ),
        }),
      ]);
    },
  });
}
