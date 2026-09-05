import { useQuery } from "@tanstack/react-query";

import * as ubicacionesApi from "../api/ubicaciones-api";

export const ubicacionesQueryKeys = {
  departments: () => ["ubicaciones", "departments"] as const,
  municipalities: (departmentId: string) =>
    ["ubicaciones", "municipalities", departmentId] as const,
};

export function useDepartmentsQuery() {
  return useQuery({
    queryKey: ubicacionesQueryKeys.departments(),
    queryFn: () => ubicacionesApi.listDepartments(),
    retry: false,
  });
}

export function useMunicipalitiesQuery(departmentId: string, enabled: boolean) {
  return useQuery({
    queryKey: ubicacionesQueryKeys.municipalities(departmentId),
    queryFn: () => ubicacionesApi.listMunicipalities(departmentId),
    enabled,
    retry: false,
  });
}
