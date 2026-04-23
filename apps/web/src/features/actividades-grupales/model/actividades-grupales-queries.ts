import { type ActividadGrupalType, type CreateActividadGrupalRequest } from "@cuidarte/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import * as actividadesGrupalesApi from "../api/actividades-grupales-api";

export const actividadesGrupalesQueryKeys = {
  list: (params: {
    search: string;
    activityType: ActividadGrupalType | null;
    tenantId: string | null;
  }) => ["actividades-grupales", params] as const,
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
