import {
  type CreateNutricionFollowUpRequest,
  type CreateNutricionPlanRequest,
  type NutricionAdultoListQuery,
  type NutricionAdultoListResponse,
  nutricionAdultoListResponseSchema,
  type NutricionAdultoProfileResponse,
  nutricionAdultoProfileResponseSchema,
  type NutricionPlanDetail,
  nutricionPlanDetailSchema,
  type UpdateNutricionFollowUpRequest,
  type UpdateNutricionPlanRequest,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function listNutricionAdultosMayores(
  params: NutricionAdultoListQuery,
): Promise<NutricionAdultoListResponse> {
  const searchParams = new URLSearchParams({
    page: String(params.page),
    pageSize: String(params.pageSize),
  });

  if (params.search !== null && params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  return fetchJson(
    `${getApiBaseUrl()}/nutricion/adultos-mayores?${searchParams.toString()}`,
    nutricionAdultoListResponseSchema,
  );
}

export function getNutricionAdultoProfile(
  adultoMayorId: string,
): Promise<NutricionAdultoProfileResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/nutricion/adultos-mayores/${adultoMayorId}`,
    nutricionAdultoProfileResponseSchema,
  );
}

export function getNutricionPlan(planId: string): Promise<NutricionPlanDetail> {
  return fetchJson(`${getApiBaseUrl()}/nutricion/planes/${planId}`, nutricionPlanDetailSchema);
}

export function createNutricionPlan(
  request: CreateNutricionPlanRequest,
): Promise<NutricionPlanDetail> {
  return fetchJson(`${getApiBaseUrl()}/nutricion/planes`, nutricionPlanDetailSchema, {
    method: "POST",
    body: request,
  });
}

export function updateNutricionPlan(
  planId: string,
  request: UpdateNutricionPlanRequest,
): Promise<NutricionPlanDetail> {
  return fetchJson(`${getApiBaseUrl()}/nutricion/planes/${planId}`, nutricionPlanDetailSchema, {
    method: "PATCH",
    body: request,
  });
}

export function createNutricionFollowUp(
  planId: string,
  request: CreateNutricionFollowUpRequest,
): Promise<NutricionPlanDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/nutricion/planes/${planId}/seguimientos`,
    nutricionPlanDetailSchema,
    {
      method: "POST",
      body: request,
    },
  );
}

export function updateNutricionFollowUp(
  followUpId: string,
  request: UpdateNutricionFollowUpRequest,
): Promise<NutricionPlanDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/nutricion/seguimientos/${followUpId}`,
    nutricionPlanDetailSchema,
    {
      method: "PATCH",
      body: request,
    },
  );
}
