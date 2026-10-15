import {
  type CreateActividadGrupalTipoRequest,
  type UpdateActividadGrupalTipoRequest,
  type UpdateActividadGrupalTipoStatusRequest,
  type UpdateActividadGrupalGlobalSeriesRequest,
  type UpdateActividadGrupalTipoConsecutiveConfigRequest,
  type UpdateActividadGrupalTipoGlobalConsecutiveConfigRequest,
} from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as actividadGrupalTiposApi from "../api/actividad-grupal-tipos-api";

export const actividadGrupalTiposQueryKeys = {
  globalSeries: () => ["actividad-grupal-tipos", "global-series"] as const,
  list: (params: { tenantId: string | null; includeInactive: boolean }) =>
    ["actividad-grupal-tipos", params] as const,
};

export function useActividadGrupalGlobalSeriesQuery(enabled = true) {
  return useQuery({
    queryKey: actividadGrupalTiposQueryKeys.globalSeries(),
    queryFn: () => actividadGrupalTiposApi.getActividadGrupalGlobalSeries(),
    enabled,
    retry: false,
  });
}

export function useUpdateActividadGrupalGlobalSeriesMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateActividadGrupalGlobalSeriesRequest) =>
      actividadGrupalTiposApi.updateActividadGrupalGlobalSeries(request),
    onSuccess: async (response) => {
      queryClient.setQueryData(actividadGrupalTiposQueryKeys.globalSeries(), response);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividad-grupal-tipos"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
      ]);
    },
  });
}

export function useActividadGrupalTiposQuery(
  params: { tenantId: string | null; includeInactive: boolean },
  enabled = true,
) {
  return useQuery({
    queryKey: actividadGrupalTiposQueryKeys.list(params),
    queryFn: () => actividadGrupalTiposApi.listActividadGrupalTipos(params),
    enabled,
    retry: false,
  });
}

export function useCreateActividadGrupalTipoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateActividadGrupalTipoRequest) =>
      actividadGrupalTiposApi.createActividadGrupalTipo(request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividad-grupal-tipos"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useUpdateActividadGrupalTipoMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { id: string; payload: UpdateActividadGrupalTipoRequest }) =>
      actividadGrupalTiposApi.updateActividadGrupalTipo(request.id, request.payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividad-grupal-tipos"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}

export function useActividadGrupalTipoCreatorOptionsQuery(id: string | null, enabled = true) {
  return useQuery({
    queryKey: ["actividad-grupal-tipo-creators", id],
    queryFn: () => {
      if (id === null) throw new Error("Actividad no seleccionada.");
      return actividadGrupalTiposApi.listActividadGrupalTipoCreatorOptions(id);
    },
    enabled: enabled && id !== null,
    retry: false,
  });
}

export function useUpdateActividadGrupalTipoGlobalConsecutiveConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: UpdateActividadGrupalTipoGlobalConsecutiveConfigRequest) =>
      actividadGrupalTiposApi.updateActividadGrupalTipoGlobalConsecutiveConfig(request),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividad-grupal-tipos"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
      ]);
    },
  });
}
export function useUpdateActividadGrupalTipoConsecutiveConfigMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: {
      id: string;
      payload: UpdateActividadGrupalTipoConsecutiveConfigRequest;
    }) =>
      actividadGrupalTiposApi.updateActividadGrupalTipoConsecutiveConfig(
        request.id,
        request.payload,
      ),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividad-grupal-tipos"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
      ]);
    },
  });
}

export function useUpdateActividadGrupalTipoStatusMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: { id: string; payload: UpdateActividadGrupalTipoStatusRequest }) =>
      actividadGrupalTiposApi.updateActividadGrupalTipoStatus(request.id, request.payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["actividad-grupal-tipos"] }),
        queryClient.invalidateQueries({ queryKey: ["actividades-grupales"] }),
        queryClient.invalidateQueries({ queryKey: ["home"] }),
      ]);
    },
  });
}
