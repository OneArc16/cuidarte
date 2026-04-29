import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as atencionesApi from "../api/atenciones-individuales-api";

export const atencionesIndividualesQueryKeys = {
  detail: (atencionId: string) => ["atenciones-individuales", atencionId] as const,
  adultoLookup: (adultoMayorId: string) =>
    ["atenciones-individuales", "adulto-lookup", adultoMayorId] as const,
  history: (adultoMayorId: string) =>
    ["atenciones-individuales", "history", adultoMayorId] as const,
};

export function useAtencionIndividualAdultoLookupQuery(adultoMayorId: string) {
  return useQuery({
    queryKey: atencionesIndividualesQueryKeys.adultoLookup(adultoMayorId),
    queryFn: () => atencionesApi.lookupAtencionIndividualAdultoMayor(adultoMayorId),
    retry: false,
  });
}

export function useAtencionIndividualQuery(atencionId: string) {
  return useQuery({
    queryKey: atencionesIndividualesQueryKeys.detail(atencionId),
    queryFn: () => atencionesApi.getAtencionIndividual(atencionId),
    retry: false,
  });
}

export function useHistoriaClinicaQuery(adultoMayorId: string) {
  return useQuery({
    queryKey: atencionesIndividualesQueryKeys.history(adultoMayorId),
    queryFn: () => atencionesApi.getHistoriaClinica(adultoMayorId),
    retry: false,
  });
}

export function useCreateAtencionIndividualMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: atencionesApi.CreateAtencionIndividualWithSupportsRequest) =>
      atencionesApi.createAtencionIndividual(request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(atencionesIndividualesQueryKeys.detail(detail.id), detail);
      await queryClient.invalidateQueries({ queryKey: ["atenciones-individuales"] });
    },
  });
}

export function useUpdateAtencionIndividualMutation(atencionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: atencionesApi.UpdateAtencionIndividualWithSupportsRequest) =>
      atencionesApi.updateAtencionIndividual(atencionId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(atencionesIndividualesQueryKeys.detail(atencionId), detail);
      await queryClient.invalidateQueries({ queryKey: ["atenciones-individuales"] });
    },
  });
}
