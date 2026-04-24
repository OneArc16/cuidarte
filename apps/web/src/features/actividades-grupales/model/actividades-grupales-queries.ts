import {
  type ActividadGrupalType,
  type CreateActividadGrupalRequest,
  type SaveActividadGrupalDiligenciamiento,
} from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as actividadesGrupalesApi from "../api/actividades-grupales-api";

type SaveActividadGrupalDiligenciamientoMutationRequest = {
  activityId: string;
  payload: SaveActividadGrupalDiligenciamiento;
  newPhotos: File[];
  newPdf: File | null;
};

export const actividadesGrupalesQueryKeys = {
  list: (params: {
    search: string;
    activityType: ActividadGrupalType | null;
    tenantId: string | null;
  }) => ["actividades-grupales", params] as const,
  detail: (activityId: string) => ["actividades-grupales", activityId, "diligenciamiento"] as const,
  integranteOptions: (activityId: string, search: string) =>
    ["actividades-grupales", activityId, "integrantes-options", search] as const,
  tenantOptions: () => ["actividades-grupales", "tenant-options"] as const,
  formOptions: (tenantId: string | null) =>
    ["actividades-grupales", "form-options", tenantId] as const,
};

export function useActividadesGrupalesQuery(params: {
  search: string;
  activityType: ActividadGrupalType | null;
  tenantId: string | null;
}) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.list(params),
    queryFn: () => actividadesGrupalesApi.listActividadesGrupales(params),
    retry: false,
  });
}

export function useActividadGrupalTenantOptionsQuery(enabled: boolean) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.tenantOptions(),
    queryFn: () => actividadesGrupalesApi.listActividadGrupalTenantOptions(),
    enabled,
    retry: false,
  });
}

export function useActividadGrupalFormOptionsQuery(tenantId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.formOptions(tenantId),
    queryFn: () => {
      if (tenantId === null) {
        throw new Error("Centro no seleccionado.");
      }

      return actividadesGrupalesApi.getActividadGrupalFormOptions(tenantId);
    },
    enabled,
    retry: false,
  });
}

export function useActividadGrupalDiligenciamientoQuery(activityId: string) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.detail(activityId),
    queryFn: () => actividadesGrupalesApi.getActividadGrupalDiligenciamiento(activityId),
    retry: false,
  });
}

export function useActividadGrupalIntegranteOptionsQuery(
  activityId: string,
  search: string,
  enabled: boolean,
) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.integranteOptions(activityId, search),
    queryFn: () =>
      actividadesGrupalesApi.searchActividadGrupalIntegranteOptions(activityId, search),
    enabled,
    retry: false,
  });
}

export function useCreateActividadGrupalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateActividadGrupalRequest) =>
      actividadesGrupalesApi.createActividadGrupal(request),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] });
    },
  });
}

export function useSaveActividadGrupalDiligenciamientoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: SaveActividadGrupalDiligenciamientoMutationRequest) =>
      actividadesGrupalesApi.saveActividadGrupalDiligenciamiento(request.activityId, request),
    onSuccess: async (detail, request) => {
      queryClient.setQueryData(actividadesGrupalesQueryKeys.detail(request.activityId), detail);
      await queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] });
    },
  });
}
