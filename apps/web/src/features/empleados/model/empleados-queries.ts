import {
  type CreateEmpleadoRequest,
  type SetTenantActiveSignerRequest,
  type UpdateEmpleadoRequest,
  type UpdateEmpleadoPermissionsRequest,
  type UpdateEmpleadoActividadGrupalOrganizerPermissionRequest,
} from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as empleadosApi from "../api/empleados-api";

export const empleadosQueryKeys = {
  list: (params: { search: string }) => ["empleados", params] as const,
  detail: (empleadoId: string) => ["empleados", empleadoId] as const,
  tenantOptions: () => ["empleados", "tenant-options"] as const,
  signaturePreview: (empleadoId: string) => ["empleados", empleadoId, "signature-preview"] as const,
  permissions: (empleadoId: string) => ["empleados", empleadoId, "permissions"] as const,
  activityOrganizerPermission: (empleadoId: string) =>
    ["empleados", empleadoId, "activity-organizer-permission"] as const,
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
    queryKey:
      empleadoId === null
        ? ["empleados", "detail", "empty"]
        : empleadosQueryKeys.detail(empleadoId),
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

export function useEmpleadoPermissionsQuery(empleadoId: string, enabled: boolean) {
  return useQuery({
    queryKey: empleadosQueryKeys.permissions(empleadoId),
    queryFn: () => empleadosApi.getEmpleadoPermissions(empleadoId),
    enabled,
    retry: false,
  });
}

export function useUpdateEmpleadoPermissionsMutation(empleadoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateEmpleadoPermissionsRequest) =>
      empleadosApi.updateEmpleadoPermissions(empleadoId, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(empleadosQueryKeys.permissions(empleadoId), response);
      await queryClient.invalidateQueries({ queryKey: empleadosQueryKeys.permissions(empleadoId) });
    },
  });
}

export function useEmpleadoActividadGrupalOrganizerPermissionQuery(
  empleadoId: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: empleadosQueryKeys.activityOrganizerPermission(empleadoId),
    queryFn: () => empleadosApi.getEmpleadoActividadGrupalOrganizerPermission(empleadoId),
    enabled,
    retry: false,
  });
}

export function useUpdateEmpleadoActividadGrupalOrganizerPermissionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      empleadoId,
      request,
    }: {
      empleadoId: string;
      request: UpdateEmpleadoActividadGrupalOrganizerPermissionRequest;
    }) => empleadosApi.updateEmpleadoActividadGrupalOrganizerPermission(empleadoId, request),
    onSuccess: async (response) => {
      queryClient.setQueryData(
        empleadosQueryKeys.activityOrganizerPermission(response.employeeId),
        response,
      );
      await queryClient.invalidateQueries({
        queryKey: empleadosQueryKeys.activityOrganizerPermission(response.employeeId),
      });
    },
  });
}

export function useEmpleadoSignaturePreviewQuery(empleadoId: string, enabled: boolean) {
  return useQuery({
    queryKey: empleadosQueryKeys.signaturePreview(empleadoId),
    queryFn: () => empleadosApi.getEmpleadoSignatureFile(empleadoId),
    enabled,
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
    mutationFn: (request: UpdateEmpleadoRequest) =>
      empleadosApi.updateEmpleado(empleadoId, request),
    onSuccess: async (detail) => {
      queryClient.setQueryData(empleadosQueryKeys.detail(empleadoId), detail);
      await queryClient.invalidateQueries({ queryKey: ["empleados"] });
    },
  });
}

export function useUploadEmpleadoSignatureMutation(empleadoId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => empleadosApi.uploadEmpleadoSignature(empleadoId, file),
    onSuccess: async (detail) => {
      queryClient.setQueryData(empleadosQueryKeys.detail(empleadoId), detail);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["empleados"] }),
        queryClient.invalidateQueries({
          queryKey: empleadosQueryKeys.signaturePreview(empleadoId),
        }),
      ]);
    },
  });
}

export function useSetTenantActiveSignerMutation(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SetTenantActiveSignerRequest) =>
      empleadosApi.setTenantActiveSigner(tenantId, request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["empleados"] }),
        queryClient.invalidateQueries({ queryKey: ["backoffice", "tenants"] }),
      ]);
    },
  });
}

export function useClearTenantActiveSignerMutation(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => empleadosApi.clearTenantActiveSigner(tenantId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["empleados"] }),
        queryClient.invalidateQueries({ queryKey: ["backoffice", "tenants"] }),
      ]);
    },
  });
}
