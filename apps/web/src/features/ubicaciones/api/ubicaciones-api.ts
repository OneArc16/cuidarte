import {
  type DepartmentsResponse,
  type MunicipalitiesResponse,
  departmentsResponseSchema,
  municipalitiesResponseSchema,
} from "@cuidarte/contracts";

import { getApiBaseUrl } from "@/shared/api/api-config";
import { fetchJson } from "@/shared/api/fetch-json";

export function listDepartments(): Promise<DepartmentsResponse> {
  return fetchJson(`${getApiBaseUrl()}/ubicaciones/departments`, departmentsResponseSchema);
}

export function listMunicipalities(departmentId: string): Promise<MunicipalitiesResponse> {
  return fetchJson(
    `${getApiBaseUrl()}/ubicaciones/departments/${departmentId}/municipalities`,
    municipalitiesResponseSchema,
  );
}
