import { type AtencionEnfermeriaListQuery } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as adultosMayoresApi from "@/features/adultos-mayores/api/adultos-mayores-api";
import * as atencionesEnfermeriaApi from "../api/atenciones-enfermeria-api";

export const atencionesEnfermeriaQueryKeys = {
  list: (params: AtencionEnfermeriaListQuery) => ["atenciones-enfermeria", params] as const,
  adults: (search: string) => ["atenciones-enfermeria", "adultos-mayores", search] as const,
  detail: (atencionId: string) => ["atenciones-enfermeria", atencionId] as const,
  adultoLookup: (adultoMayorId: string) =>
    ["atenciones-enfermeria", "adulto-lookup", adultoMayorId] as const,
  history: (adultoMayorId: string) => ["atenciones-enfermeria", "history", adultoMayorId] as const,
  trash: (adultoMayorId: string) => ["atenciones-enfermeria", "trash", adultoMayorId] as const,
};

export function useAtencionesEnfermeriaListQuery(params: AtencionEnfermeriaListQuery) {
  return useQuery({
    queryKey: atencionesEnfermeriaQueryKeys.list(params),
    queryFn: () => atencionesEnfermeriaApi.listAtencionesEnfermeria(params),
    retry: false,
  });
}

export function useAtencionesEnfermeriaTrashQuery(adultoMayorId: string, enabled = true) {
  return useQuery({
    queryKey: atencionesEnfermeriaQueryKeys.trash(adultoMayorId),
    queryFn: () => atencionesEnfermeriaApi.getAtencionesEnfermeriaTrash(adultoMayorId),
    enabled,
    retry: false,
  });
}

export function useAtencionesEnfermeriaAdultosMayoresQuery(search: string) {
  return useQuery({
    queryKey: atencionesEnfermeriaQueryKeys.adults(search),
    queryFn: () => adultosMayoresApi.listAdultosMayores({ search }),
    retry: false,
  });
}

export function useAtencionesEnfermeriaAdultoLookupQuery(adultoMayorId: string) {
  return useQuery({
    queryKey: atencionesEnfermeriaQueryKeys.adultoLookup(adultoMayorId),
    queryFn: () => atencionesEnfermeriaApi.lookupAtencionEnfermeriaAdultoMayor(adultoMayorId),
    retry: false,
  });
}

export function useAtencionesEnfermeriaHistoryQuery(adultoMayorId: string, enabled = true) {
  return useQuery({
    queryKey: atencionesEnfermeriaQueryKeys.history(adultoMayorId),
    queryFn: () => atencionesEnfermeriaApi.getAtencionesEnfermeriaHistory(adultoMayorId),
    enabled,
    retry: false,
  });
}

export function useAtencionEnfermeriaQuery(atencionId: string) {
  return useQuery({
    queryKey: atencionesEnfermeriaQueryKeys.detail(atencionId),
    queryFn: () => atencionesEnfermeriaApi.getAtencionEnfermeria(atencionId),
    retry: false,
  });
}

export function useCreateAtencionEnfermeriaMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: Parameters<typeof atencionesEnfermeriaApi.createAtencionEnfermeria>[0]) =>
      atencionesEnfermeriaApi.createAtencionEnfermeria(request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(atencionesEnfermeriaQueryKeys.detail(detail.id), detail);
      await queryClient.invalidateQueries({ queryKey: ["atenciones-enfermeria"] });
    },
  });
}

export function useUpdateAtencionEnfermeriaMutation(atencionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: Parameters<typeof atencionesEnfermeriaApi.updateAtencionEnfermeria>[1]) =>
      atencionesEnfermeriaApi.updateAtencionEnfermeria(atencionId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(atencionesEnfermeriaQueryKeys.detail(atencionId), detail);
      await queryClient.invalidateQueries({ queryKey: ["atenciones-enfermeria"] });
    },
  });
}

export function useDeleteAtencionEnfermeriaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: atencionesEnfermeriaApi.deleteAtencionEnfermeria,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["atenciones-enfermeria"] });
    },
  });
}

export function useRestoreAtencionEnfermeriaMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: atencionesEnfermeriaApi.restoreAtencionEnfermeria,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["atenciones-enfermeria"] });
    },
  });
}
