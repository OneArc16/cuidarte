export type DepartmentRecord = {
  id: string;
  name: string;
};

export type MunicipalityRecord = {
  id: string;
  departmentId: string;
  name: string;
};

export type DepartmentMunicipalityPair = {
  department: DepartmentRecord;
  municipality: MunicipalityRecord;
};
