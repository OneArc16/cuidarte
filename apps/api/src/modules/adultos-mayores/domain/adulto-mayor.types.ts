import {
  type AdultoMayorBloodType,
  type AdultoMayorDocumentType,
  type AdultoMayorHealthRegime,
  type AdultoMayorSex,
  type AdultoMayorStatus,
  type AdultoMayorZone,
} from "@cuidarte/contracts";

export type AdultosMayoresScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type FindAdultosMayoresQuery = {
  search: string | null;
  scope: AdultosMayoresScope;
};

export type FindAdultoMayorByIdQuery = {
  id: string;
  scope: AdultosMayoresScope;
};

export type FindAdultoMayorByDocumentQuery = {
  tenantId: string;
  documentType: AdultoMayorDocumentType;
  documentNumber: string;
  excludeId?: string;
};

export type FindAdultosMayoresTrashQuery = FindAdultosMayoresQuery;

export type AdultoMayorTenantOptionRecord = {
  id: string;
  name: string;
};

export type AdultoMayorCommandRecord = {
  tenantId: string;
  documentType: AdultoMayorDocumentType;
  documentNumber: string;
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  email: string | null;
  birthDate: string;
  sex: AdultoMayorSex;
  status: AdultoMayorStatus;
  educationLevel: string | null;
  disability: string | null;
  populationGroup: string | null;
  address: string;
  departmentId: string;
  municipalityId: string;
  department: string;
  municipality: string;
  zone: AdultoMayorZone;
  country: string;
  emergencyContactFullName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  bloodType: AdultoMayorBloodType | null;
  sisben: string | null;
  healthRegime: AdultoMayorHealthRegime | null;
  epsId: string | null;
  livesWithSomeone: boolean;
  companion: string | null;
  economicIncome: number | null;
  socialProgramBeneficiary: boolean;
};

export type CreateAdultoMayorRecordCommand = AdultoMayorCommandRecord;

export type UpdateAdultoMayorRecordCommand = Omit<AdultoMayorCommandRecord, "tenantId"> & {
  id: string;
};

export type AdultoMayorAuditCommand = {
  actorUserId: string;
  action:
    | "adultos-mayores.created"
    | "adultos-mayores.updated"
    | "adultos-mayores.deleted"
    | "adultos-mayores.restored";
  targetTenantId: string;
  summary: string;
  metadata: Record<string, unknown>;
};

export type AdultoMayorRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentType: AdultoMayorDocumentType;
  documentNumber: string;
  names: string;
  surnames: string;
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  phone: string | null;
  phoneSecondary: string | null;
  email: string | null;
  birthDate: string;
  sex: AdultoMayorSex;
  status: AdultoMayorStatus;
  educationLevel: string | null;
  disability: string | null;
  populationGroup: string | null;
  address: string;
  departmentId: string | null;
  municipalityId: string | null;
  department: string;
  municipality: string;
  zone: AdultoMayorZone;
  country: string;
  emergencyContactFullName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  bloodType: AdultoMayorBloodType | null;
  sisben: string | null;
  healthRegime: AdultoMayorHealthRegime | null;
  epsId: string | null;
  epsName: string | null;
  eps: string | null;
  livesWithSomeone: boolean;
  companion: string | null;
  economicIncome: number | null;
  socialProgramBeneficiary: boolean;
  createdAt: Date;
  updatedAt: Date;
  documentFile: AdultoMayorDocumentRecord | null;
};

export type AdultoMayorTrashRecord = Pick<
  AdultoMayorRecord,
  | "id"
  | "tenantId"
  | "tenantName"
  | "documentType"
  | "documentNumber"
  | "names"
  | "surnames"
  | "phone"
  | "birthDate"
  | "sex"
  | "status"
  | "createdAt"
  | "updatedAt"
> & {
  deletedAt: Date;
  deletedByUserId: string;
  deletedByUserFullName: string;
  deletionReason: string;
};

export type SendAdultoMayorToTrashCommand = {
  id: string;
  actorUserId: string;
  reason: string;
};

export type RestoreAdultoMayorCommand = {
  id: string;
  actorUserId: string;
};

export type AdultoMayorDocumentRecord = {
  id: string;
  adultoMayorId: string;
  originalName: string;
  mimeType: "application/pdf";
  sizeBytes: number;
  relativePath: string;
  uploadedByUserId: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PersistAdultoMayorDocumentCommand = AdultoMayorDocumentRecord;
