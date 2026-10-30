import { type TrabajoSocialAdultoListQuery } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as api from "../api/trabajo-social-api";

export const trabajoSocialKeys = {
  adultos: (query: TrabajoSocialAdultoListQuery) => ["trabajo-social", "adultos", query] as const,
  history: (id: string) => ["trabajo-social", "historial", id] as const,
};
export const useTrabajoSocialAdultosQuery = (query: TrabajoSocialAdultoListQuery) =>
  useQuery({
    queryKey: trabajoSocialKeys.adultos(query),
    queryFn: () => api.listTrabajoSocialAdultos(query),
    placeholderData: (previous) => previous,
    retry: false,
  });
export const useTrabajoSocialHistoryQuery = (id: string) =>
  useQuery({
    queryKey: trabajoSocialKeys.history(id),
    queryFn: () => api.getTrabajoSocialHistory(id),
    retry: false,
  });
export function useCreateTrabajoSocialSessionMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: api.createTrabajoSocialSession,
    onSuccess: async (_, request) => {
      await client.invalidateQueries({ queryKey: ["trabajo-social"] });
      await client.invalidateQueries({
        queryKey: trabajoSocialKeys.history(request.adultoMayorId),
      });
    },
  });
}
