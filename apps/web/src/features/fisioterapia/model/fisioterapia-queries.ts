import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FisioterapiaAdultoListQuery } from "@cuidarte/contracts";
import * as api from "../api/fisioterapia-api";
export const fisioterapiaKeys = {
  adultos: (query: FisioterapiaAdultoListQuery) => ["fisioterapia", "adultos", query] as const,
  history: (id: string) => ["fisioterapia", "historial", id] as const,
};
export const useFisioterapiaAdultosQuery = (query: FisioterapiaAdultoListQuery) =>
  useQuery({
    queryKey: fisioterapiaKeys.adultos(query),
    queryFn: () => api.listFisioterapiaAdultos(query),
    placeholderData: (previous) => previous,
    retry: false,
  });
export const useFisioterapiaHistoryQuery = (id: string) =>
  useQuery({
    queryKey: fisioterapiaKeys.history(id),
    queryFn: () => api.getFisioterapiaHistory(id),
    retry: false,
  });
export function useCreateFisioterapiaSessionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createFisioterapiaSession,
    onSuccess: async (_, request) => {
      await client.invalidateQueries({ queryKey: ["fisioterapia"] });
      await client.invalidateQueries({ queryKey: fisioterapiaKeys.history(request.adultoMayorId) });
    },
  });
}
