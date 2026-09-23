import {
  type ActividadGrupalTiposListResponse,
  type CreateActividadGrupalTipoRequest,
  type UpdateActividadGrupalTipoRequest,
  type UpdateActividadGrupalTipoStatusRequest,
  type UpdateActividadGrupalTipoConsecutiveConfigRequest,
  actividadGrupalTipoSchema,
  actividadGrupalTiposListResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

type ListActividadGrupalTiposParams = {
  tenantId: string | null;
  includeInactive: boolean;
};

export function listActividadGrupalTipos(
  params: ListActividadGrupalTiposParams,
): Promise<ActividadGrupalTiposListResponse> {
  const searchParams = new URLSearchParams();

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  if (params.includeInactive) {
    searchParams.set("includeInactive", "true");
  }

  const queryString = searchParams.toString();

  return fetchJson(
    `${getApiBaseUrl()}/actividad-grupal-tipos${queryString === "" ? "" : `?${queryString}`}`,
    actividadGrupalTiposListResponseSchema,
  );
}

export function createActividadGrupalTipo(request: CreateActividadGrupalTipoRequest) {
  return fetchJson(`${getApiBaseUrl()}/actividad-grupal-tipos`, actividadGrupalTipoSchema, {
    method: "POST",
    body: request,
  });
}

export function updateActividadGrupalTipo(id: string, request: UpdateActividadGrupalTipoRequest) {
  return fetchJson(`${getApiBaseUrl()}/actividad-grupal-tipos/${id}`, actividadGrupalTipoSchema, {
    method: "PATCH",
    body: request,
  });
}

export function updateActividadGrupalTipoConsecutiveConfig(
  id: string,
  request: UpdateActividadGrupalTipoConsecutiveConfigRequest,
) {
  return fetchJson(
    `${getApiBaseUrl()}/actividad-grupal-tipos/${id}/consecutive-config`,
    actividadGrupalTipoSchema,
    { method: "PATCH", body: request },
  );
}


export function updateActividadGrupalTipoStatus(
  id: string,
  request: UpdateActividadGrupalTipoStatusRequest,
) {
  return fetchJson(
    `${getApiBaseUrl()}/actividad-grupal-tipos/${id}/status`,
    actividadGrupalTipoSchema,
    {
      method: "PATCH",
      body: request,
    },
  );
}
