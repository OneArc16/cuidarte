import { type CreateEquipoRequest, type UpdateEquipoRequest } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as equiposApi from "../api/equipos-api";

const equiposQueryKey = ["equipos"] as const;

export function useEquiposQuery(enabled = true) {
  return useQuery({ queryKey: equiposQueryKey, queryFn: equiposApi.listEquipos, enabled, retry: false });
}

export function useCreateEquipoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: CreateEquipoRequest) => equiposApi.createEquipo(request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equiposQueryKey }),
  });
}

export function useUpdateEquipoMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request: UpdateEquipoRequest }) =>
      equiposApi.updateEquipo(id, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: equiposQueryKey }),
  });
}
