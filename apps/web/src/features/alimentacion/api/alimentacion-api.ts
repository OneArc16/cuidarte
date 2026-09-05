import {
  type AlimentacionAdultoOptionsResponse,
  type AlimentacionDetail,
  type AlimentacionImportedFormatoUploadResponse,
  type AlimentacionImportedFormatoVersionsResponse,
  type AlimentacionListResponse,
  type AlimentacionLookupByAdultoMayorResponse,
  type AlimentacionTenantOptionsResponse,
  type CreateAlimentacionBatchRequest,
  type CreateAlimentacionBatchResponse,
  type DeleteAlimentacionResponse,
  type UpdateAlimentacionRequest,
  alimentacionAdultoOptionsResponseSchema,
  alimentacionDetailSchema,
  alimentacionImportedFormatoUploadResponseSchema,
  alimentacionImportedFormatoVersionsResponseSchema,
  alimentacionListResponseSchema,
  alimentacionLookupByAdultoMayorResponseSchema,
  alimentacionTenantOptionsResponseSchema,
  createAlimentacionBatchResponseSchema,
  deleteAlimentacionResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchBlob } from "@/shared/api/fetch-blob";
import { fetchJson } from "@/shared/api/fetch-json";

type ListAlimentacionParams = {
  search: string;
  deliveryMonth: string | null;
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

export function deleteAlimentacionRecord(recordId: string): Promise<DeleteAlimentacionResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/${recordId}`,
    deleteAlimentacionResponseSchema,
    {
      method: "DELETE",
    },
  );
}

export function exportAlimentacionFormatoEntregaPdf(params: {
  adultoMayorId: string;
  deliveryMonth: string;
}): Promise<Blob> {
  return fetchBlob(buildAlimentacionFormatoEntregaPdfUrl(params));
}

export function buildAlimentacionFormatoEntregaPdfUrl(params: {
  adultoMayorId: string;
  deliveryMonth: string;
}): string {
  const searchParams = new URLSearchParams({
    deliveryMonth: params.deliveryMonth,
  });

  return `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores/${params.adultoMayorId}/formato-entrega/pdf?${searchParams.toString()}`;
}

export function importAlimentacionFormatoEntregaPdf(params: {
  adultoMayorId: string;
  deliveryMonth: string;
  file: File;
}): Promise<AlimentacionImportedFormatoUploadResponse> {
  const searchParams = new URLSearchParams({ deliveryMonth: params.deliveryMonth });
  const formData = new FormData();

  formData.set("file", params.file, params.file.name);

  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores/${params.adultoMayorId}/formato-entrega/imported-pdfs?${searchParams.toString()}`,
    alimentacionImportedFormatoUploadResponseSchema,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function listAlimentacionImportedFormatoVersions(params: {
  adultoMayorId: string;
  deliveryMonth: string;
}): Promise<AlimentacionImportedFormatoVersionsResponse> {
  const searchParams = new URLSearchParams({ deliveryMonth: params.deliveryMonth });

  return fetchJson(
    `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores/${params.adultoMayorId}/formato-entrega/imported-pdfs?${searchParams.toString()}`,
    alimentacionImportedFormatoVersionsResponseSchema,
  );
}

export function downloadAlimentacionImportedFormatoVersion(params: {
  adultoMayorId: string;
  versionId: string;
}): Promise<Blob> {
  return fetchBlob(
    `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores/${params.adultoMayorId}/formato-entrega/imported-pdfs/${params.versionId}/download`,
  );
}

export function buildAlimentacionImportedFormatoVersionDownloadUrl(params: {
  adultoMayorId: string;
  versionId: string;
}): string {
  return `${getApiBaseUrl()}/registro-alimentacion/adultos-mayores/${params.adultoMayorId}/formato-entrega/imported-pdfs/${params.versionId}/download`;
}

function buildAlimentacionUrl(params: ListAlimentacionParams): string {
  const searchParams = new URLSearchParams();

  if (params.search.trim() !== "") {
    searchParams.set("search", params.search.trim());
  }

  if (params.deliveryMonth !== null) {
    searchParams.set("deliveryMonth", params.deliveryMonth);
  }

  if (params.tenantId !== null) {
    searchParams.set("tenantId", params.tenantId);
  }

  const queryString = searchParams.toString();

  return `${getApiBaseUrl()}/registro-alimentacion${queryString === "" ? "" : `?${queryString}`}`;
}
