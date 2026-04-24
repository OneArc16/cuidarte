import {
  type AlimentacionAdultoOptionsResponse,
  type AlimentacionDetail,
  type AlimentacionListResponse,
  type AlimentacionLookupByAdultoMayorResponse,
  type AlimentacionTenantOptionsResponse,
  type CreateAlimentacionBatchRequest,
  type CreateAlimentacionBatchResponse,
  type UpdateAlimentacionRequest,
  alimentacionAdultoOptionsResponseSchema,
  alimentacionDetailSchema,
  alimentacionListResponseSchema,
  alimentacionLookupByAdultoMayorResponseSchema,
  alimentacionTenantOptionsResponseSchema,
  createAlimentacionBatchResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

type ListAlimentacionParams = {
  search: string;
  deliveryDate: string | null;
  tenantId: string | null;
};

type SearchAlimentacionAdultosParams = {
  search: string;
  deliveryDate: string;
  tenantId: string | null;
};

export function listRegistrosAlimentacion(
  params: ListAlimentacionParams,
): Promise<AlimentacionListResponse> {
  return fetchJson(buildAlimentacionUrl(params), alimentacionListResponseSchema);
}

export function listAlimentacionTenantOptions(): Promise<AlimentacionTenantOptionsResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/tenant-options`,
    alimentacionTenantOptionsResponseSchema,
  );
}

export function searchAlimentacionAdultosMayoresOptions(
  params: SearchAlimentacionAdultosParams,
): Promise<AlimentacionAdultoOptionsResponse> {
  const searchParams = new URLSearchParams({
    deliveryDate: params.deliveryDate,
  });

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores-options?${searchParams.toString()}`,
    alimentacionAdultoOptionsResponseSchema,
  );
}

export function lookupAlimentacionAdultoMayorByDate(
  adultoMayorId: string,
  deliveryDate: string,
): Promise<AlimentacionLookupByAdultoMayorResponse> {
  const searchParams = new URLSearchParams({ deliveryDate });

  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores/${adultoMayorId}/lookup?${searchParams.toString()}`,
    alimentacionLookupByAdultoMayorResponseSchema,
  );
}

export function createAlimentacionBatch(
  request: CreateAlimentacionBatchRequest,
): Promise<CreateAlimentacionBatchResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion`,
    createAlimentacionBatchResponseSchema,
    {
      method: "POST",
      body: request,
    },
  );
}

export function getAlimentacionRecord(recordId: string): Promise<AlimentacionDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/${recordId}`,
    alimentacionDetailSchema,
  );
}

export function updateAlimentacionRecord(
  recordId: string,
  request: UpdateAlimentacionRequest,
): Promise<AlimentacionDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/${recordId}`,
    alimentacionDetailSchema,
    {
      method: "PATCH",
      body: request,
    },
  );
}

function buildAlimentacionUrl(params: ListAlimentacionParams): string {
  const searchParams = new URLSearchParams();

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.deliveryDate !== null) {
    searchParams.set("deliveryDate", params.deliveryDate);
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/registro-alimentacion${queryString === "" ? "" : `?${queryString}`}`;
}
