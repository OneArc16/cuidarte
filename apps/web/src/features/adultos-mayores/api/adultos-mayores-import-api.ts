import {
  type AdultoMayorImportConfirmResponse,
  type AdultoMayorImportDetail,
  type AdultoMayorImportValidateResponse,
  adultoMayorImportConfirmResponseSchema,
  adultoMayorImportDetailSchema,
  adultoMayorImportValidateQuerySchema,
  adultoMayorImportValidateResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchBlob } from "@/shared/api/fetch-blob";
import { fetchJson } from "@/shared/api/fetch-json";

type ValidateAdultoMayorImportParams = {
  file: File;
  tenantId: string | null;
};

export function downloadAdultoMayorImportTemplate(): Promise<Blob> {
  return fetchBlob(`${getApiBaseUrl()}/adultos-mayores/imports/template`);
}

export function validateAdultoMayorImport(
  params: ValidateAdultoMayorImportParams,
): Promise<AdultoMayorImportValidateResponse> {
  const searchParams = new URLSearchParams();
  const parsedQuery = adultoMayorImportValidateQuerySchema.parse({ tenantId: params.tenantId });

  if (parsedQuery.tenantId !== null) {
    searchParams.set("tenantId", parsedQuery.tenantId);
  }

  const formData = new FormData();
  formData.set("file", params.file, params.file.name);

  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/imports/validate${searchParams.toString() === "" ? "" : `?${searchParams.toString()}`}`,
    adultoMayorImportValidateResponseSchema,
    {
      method: "POST",
      body: formData,
    },
  );
}

export function getAdultoMayorImport(importId: string): Promise<AdultoMayorImportDetail> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/imports/${importId}`,
    adultoMayorImportDetailSchema,
  );
}

export function confirmAdultoMayorImport(importId: string): Promise<AdultoMayorImportConfirmResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/adultos-mayores/imports/${importId}/confirm`,
    adultoMayorImportConfirmResponseSchema,
    {
      method: "POST",
    },
  );
}

export function downloadAdultoMayorImportErrors(importId: string): Promise<Blob> {
  return fetchBlob(`${getApiBaseUrl()}/adultos-mayores/imports/${importId}/errors.xlsx`);
}
