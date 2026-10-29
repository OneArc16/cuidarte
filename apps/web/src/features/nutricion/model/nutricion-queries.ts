import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type NutricionAdultoListQuery } from "@cuidarte/contracts";

import * as nutricionApi from "../api/nutricion-api";

export const nutricionQueryKeys = {
  adultos: (params: NutricionAdultoListQuery) => ["nutricion", "adultos", params] as const,
  adultoProfile: (adultoMayorId: string) => ["nutricion", "adulto", adultoMayorId] as const,
  plan: (planId: string) => ["nutricion", "plan", planId] as const,
};

export function useNutricionAdultosMayoresQuery(params: NutricionAdultoListQuery) {
  return useQuery({
    queryKey: nutricionQueryKeys.adultos(params),
    queryFn: () => nutricionApi.listNutricionAdultosMayores(params),
    placeholderData: (previousData) => previousData,
    retry: false,
  });
}

function useNutricionMutationInvalidation() {
  const queryClient = useQueryClient();

  return async (detail: Awaited<ReturnType<typeof nutricionApi.getNutricionPlan>>) => {
    queryClient.setQueryData(nutricionQueryKeys.plan(detail.id), detail);
    await queryClient.invalidateQueries({ queryKey: ["nutricion"] });
  };
}

export function useNutricionAdultoProfileQuery(adultoMayorId: string) {
  return useQuery({
    queryKey: nutricionQueryKeys.adultoProfile(adultoMayorId),
    queryFn: () => nutricionApi.getNutricionAdultoProfile(adultoMayorId),
    retry: false,
  });
}

export function useNutricionPlanQuery(planId: string | null) {
  return useQuery({
    queryKey: nutricionQueryKeys.plan(planId ?? ""),
    queryFn: () => nutricionApi.getNutricionPlan(planId ?? ""),
    enabled: planId !== null,
    retry: false,
  });
}

export function useCreateNutricionPlanMutation() {
  const onSuccess = useNutricionMutationInvalidation();
  return useMutation({ mutationFn: nutricionApi.createNutricionPlan, onSuccess });
}

export function useUpdateNutricionPlanMutation(planId: string) {
  const onSuccess = useNutricionMutationInvalidation();
  return useMutation({
    mutationFn: (request: Parameters<typeof nutricionApi.updateNutricionPlan>[1]) =>
      nutricionApi.updateNutricionPlan(planId, request),
    onSuccess,
  });
}

export function useCreateNutricionFollowUpMutation(planId: string) {
  const onSuccess = useNutricionMutationInvalidation();
  return useMutation({
    mutationFn: (request: Parameters<typeof nutricionApi.createNutricionFollowUp>[1]) =>
      nutricionApi.createNutricionFollowUp(planId, request),
    onSuccess,
  });
}

export function useUpdateNutricionFollowUpMutation(followUpId: string) {
  const onSuccess = useNutricionMutationInvalidation();
  return useMutation({
    mutationFn: (request: Parameters<typeof nutricionApi.updateNutricionFollowUp>[1]) =>
      nutricionApi.updateNutricionFollowUp(followUpId, request),
    onSuccess,
  });
}
