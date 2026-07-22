import {
  type RemoveTenantLogoResponse,
  type UploadTenantLogoResponse,
  removeTenantLogoResponseSchema,
  uploadTenantLogoResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchBlob } from "@/shared/api/fetch-blob";
import { fetchJson } from "@/shared/api/fetch-json";

export async function uploadTenantLogo(
  tenantId: string,
  file: File,
): Promise<UploadTenantLogoResponse> {
  const formData = new FormData();
  formData.set("logo", file, file.name);

  return fetchJson(
    `${getApiBaseUrl()}/backoffice/tenants/${tenantId}/logo`,
    uploadTenantLogoResponseSchema,
    { method: "PUT", body: formData },
  );
}

export function getTenantLogoFile(tenantId: string): Promise<Blob> {
  return fetchBlob(`${getApiBaseUrl()}/backoffice/tenants/${tenantId}/logo/file`);
}

export function removeTenantLogo(tenantId: string): Promise<RemoveTenantLogoResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/backoffice/tenants/${tenantId}/logo`,
    removeTenantLogoResponseSchema,
    { method: "DELETE" },
  );
}
