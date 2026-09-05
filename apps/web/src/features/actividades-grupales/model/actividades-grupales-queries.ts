import {
  type UpdateActividadGrupalRequest,
  type ActividadGrupalOrganizer,
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

type UpdateActividadGrupalMutationRequest = {
  activityId: string;
  payload: UpdateActividadGrupalRequest;
};

type TrashActividadesGrupalesParams = {
  search: string;
  activityType: ActividadGrupalType | null;
  organizer: ActividadGrupalOrganizer | null;
  tenantId: string | null;
};

type RestoreActividadGrupalMutationRequest = {
  activityId: string;
};

export const actividadesGrupalesQueryKeys = {
  list: (params: {
    search: string;
    activityType: ActividadGrupalType | null;
    organizer: ActividadGrupalOrganizer | null;
    tenantId: string | null;
  }) => ["actividades-grupales", params] as const,
  detail: (activityId: string) => ["actividades-grupales", activityId, "diligenciamiento"] as const,
  integranteOptions: (activityId: string, search: string) =>
    ["actividades-grupales", activityId, "integrantes-options", search] as const,
  tenantOptions: () => ["actividades-grupales", "tenant-options"] as const,
  formOptions: (tenantId: string | null) =>
    ["actividades-grupales", "form-options", tenantId] as const,
  editDetail: (activityId: string) => ["actividades-grupales", activityId, "edit"] as const,
  trashList: (params: TrashActividadesGrupalesParams) =>
    ["actividades-grupales", "papelera", params] as const,
};

export function useActividadesGrupalesQuery(params: {
  search: string;
  activityType: ActividadGrupalType | null;
  organizer: ActividadGrupalOrganizer | null;
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

export function useActividadGrupalEditQuery(activityId: string) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.editDetail(activityId),
    queryFn: () => actividadesGrupalesApi.getActividadGrupalForEdit(activityId),
    retry: false,
  });
}

export function useActividadesGrupalesTrashQuery(
  params: TrashActividadesGrupalesParams,
  enabled = true,
) {
  return useQuery({
    queryKey: actividadesGrupalesQueryKeys.trashList(params),
    queryFn: () => actividadesGrupalesApi.listActividadesGrupalesTrash(params),
    enabled,
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

export function useUpdateActividadGrupalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateActividadGrupalMutationRequest) =>
      actividadesGrupalesApi.updateActividadGrupal(request.activityId, request.payload),
    onSuccess: async (_, request) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
        queryClient.invalidateQueries({
          queryKey: actividadesGrupalesQueryKeys.editDetail(request.activityId),
        }),
        queryClient.invalidateQueries({
          queryKey: actividadesGrupalesQueryKeys.detail(request.activityId),
        }),
      ]);
    },
  });
}

export function useDeleteActividadGrupalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (activityId: string) => actividadesGrupalesApi.deleteActividadGrupal(activityId),
    onSuccess: async (_, activityId) => {
      queryClient.removeQueries({
        queryKey: actividadesGrupalesQueryKeys.editDetail(activityId),
      });
      queryClient.removeQueries({
        queryKey: actividadesGrupalesQueryKeys.detail(activityId),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales", "papelera"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useRestoreActividadGrupalMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: RestoreActividadGrupalMutationRequest) =>
      actividadesGrupalesApi.restoreActividadGrupal(request.activityId),
    onSuccess: async (_, request) => {
      queryClient.removeQueries({
        queryKey: actividadesGrupalesQueryKeys.editDetail(request.activityId),
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales", "papelera"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
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
