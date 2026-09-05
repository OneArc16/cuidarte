import {
  type DepartmentRecord,
  type DepartmentMunicipalityPair,
  type MunicipalityRecord,
} from "./ubicaciones.types";

export const UBICACIONES_REPOSITORY = Symbol("UBICACIONES_REPOSITORY");

export type UbicacionesRepository = {
  findActiveDepartments(): Promise<DepartmentRecord[]>;
  findActiveMunicipalitiesByDepartmentId(departmentId: string): Promise<MunicipalityRecord[]>;
  findDepartmentById(departmentId: string): Promise<DepartmentRecord | null>;
  findMunicipalityById(municipalityId: string): Promise<MunicipalityRecord | null>;
  findDepartmentMunicipalityPair(
    departmentId: string,
    municipalityId: string,
  ): Promise<DepartmentMunicipalityPair | null>;
};
