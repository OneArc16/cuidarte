import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type PsicologiaAdultoListQuery } from "@cuidarte/contracts";
import * as api from "../api/psicologia-api";
export const psicologiaKeys = {
  adultos: (query: PsicologiaAdultoListQuery) => ["psicologia", "adultos", query] as const,
  history: (id: string) => ["psicologia", "historial", id] as const,
};
export const usePsicologiaAdultosQuery = (query: PsicologiaAdultoListQuery) =>
  useQuery({
    queryKey: psicologiaKeys.adultos(query),
    queryFn: () => api.listPsicologiaAdultos(query),
    placeholderData: (previous) => previous,
    retry: false,
  });
export const usePsicologiaHistoryQuery = (id: string) =>
  useQuery({
    queryKey: psicologiaKeys.history(id),
    queryFn: () => api.getPsicologiaHistory(id),
    retry: false,
  });
export function useCreatePsicologiaSessionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createPsicologiaSession,
    onSuccess: async (_, request) => {
      await client.invalidateQueries({ queryKey: ["psicologia"] });
      await client.invalidateQueries({ queryKey: psicologiaKeys.history(request.adultoMayorId) });
    },
  });
}
