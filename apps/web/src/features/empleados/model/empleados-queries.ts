import { type CreateEmpleadoRequest, type UpdateEmpleadoRequest } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as empleadosApi from "../api/empleados-api";

export const empleadosQueryKeys = {
  list: (params: { search: string }) => ["empleados", params] as const,
  detail: (empleadoId: string) => ["empleados", empleadoId] as const,
  tenantOptions: () => ["empleados", "tenant-options"] as const,
};

export function useEmpleadosQuery(params: { search: string }) {
  return useQuery({
    queryKey: empleadosQueryKeys.list(params),
    queryFn: () => empleadosApi.listEmpleados(params),
    retry: false,
  });
}

export function useEmpleadoTenantOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: empleadosQueryKeys.tenantOptions(),
    queryFn: () => empleadosApi.listEmpleadoTenantOptions(),
    enabled,
    retry: false,
  });
}

export function useEmpleadoQuery(empleadoId: string | null) {
  return useQuery({
    queryKey: empleadoId === null ? ["empleados", "detail", "empty"] : empleadosQueryKeys.detail(empleadoId),
    queryFn: () => {
      if (empleadoId === null) {
        throw new Error("Empleado no seleccionado.");
      }

      return empleadosApi.getEmpleado(empleadoId);
    },
    enabled: empleadoId !== null,
    retry: false,
  });
}

export function useCreateEmpleadoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateEmpleadoRequest) => empleadosApi.createEmpleado(request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(empleadosQueryKeys.detail(detail.id), detail);
      await queryClient.invalidateQueries({ queryKey: ["empleados"] });
    },
  });
}

export function useUpdateEmpleadoMutation(empleadoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateEmpleadoRequest) => empleadosApi.updateEmpleado(empleadoId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(empleadosQueryKeys.detail(empleadoId), detail);
      await queryClient.invalidateQueries({ queryKey: ["empleados"] });
    },
  });
}
