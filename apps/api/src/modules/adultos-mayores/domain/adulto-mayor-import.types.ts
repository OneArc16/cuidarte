import type {
  AdultoMayorImportIssue,
  AdultoMayorImportRow,
  AdultoMayorImportStatus,
  AdultoMayorImportSummary,
  AdultoMayorImportTenant,
} from "@cuidarte/contracts";

export type AdultoMayorImportRowInput = {
  rowNumber: number;
  values: Record<string, string | null>;
};

export type AdultoMayorImportParsedWorkbook = {
  templateKey: string;
  templateVersion: number;
  generatedAt: string | null;
  rows: AdultoMayorImportRowInput[];
};

export type AdultoMayorImportStructuralError = {
  code: string;
  message: string;
};

export type AdultoMayorImportCatalogMaps = {
  departmentsByCode: Map<string, { id: string; name: string }>;
  municipalitiesByCode: Map<string, { id: string; departmentId: string; name: string }>;
  epsByCode: Map<string, { id: string; name: string; isActive: boolean }>;
};

export type AdultoMayorImportNormalizedRow = {
  documentType: "cc" | "ce" | "passport" | "other";
  documentNumber: string;
  firstName: string;
  middleName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  birthDate: string;
  sex: "female" | "male" | "other";
  educationLevel: string | null;
  disability: string | null;
  populationGroup: string | null;
  address: string;
  departmentId: string;
  municipalityId: string;
  department: string;
  municipality: string;
  zone: "urban" | "rural";
  country: string;
  phone: string | null;
  phoneSecondary: string | null;
  email: string | null;
  emergencyContactFullName: string | null;
  emergencyContactRelationship: string | null;
  emergencyContactPhone: string | null;
  emergencyContactAddress: string | null;
  bloodType: "a_positive" | "a_negative" | "b_positive" | "b_negative" | "ab_positive" | "ab_negative" | "o_positive" | "o_negative" | "unknown" | null;
  sisben: string | null;
  healthRegime: string | null;
  epsId: string | null;
  eps: string | null;
  livesWithSomeone: boolean;
  companion: string | null;
  economicIncome: number | null;
  socialProgramBeneficiary: boolean;
};

export type AdultoMayorImportExistingRecord = AdultoMayorImportNormalizedRow & {
  id: string;
  updatedAt: string;
};

export type AdultoMayorImportValidatedRow = {
  rowNumber: number;
  status: "ready" | "update_ready" | "unchanged" | "invalid";
  normalizedPayload: AdultoMayorImportNormalizedRow | null;
  issues: AdultoMayorImportIssue[];
  existingAdultoId: string | null;
  existingAdultoUpdatedAt: string | null;
};

export type AdultoMayorImportBatchRecord = {
  id: string;
  tenant: AdultoMayorImportTenant;
  requestedByUserId: string;
  originalFilename: string;
  fileChecksumSha256: string;
  templateVersion: number;
  status: AdultoMayorImportStatus;
  summary: AdultoMayorImportSummary;
  issues: AdultoMayorImportIssue[];
  rows: AdultoMayorImportRow[];
  canConfirm: boolean;
  expiresAt: Date;
  confirmedAt: Date | null;
  failureCode: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type AdultoMayorImportBatchCreateCommand = {
  tenantId: string;
  requestedByUserId: string;
  originalFilename: string;
  fileChecksumSha256: string;
  templateVersion: number;
  status: AdultoMayorImportStatus;
  summary: AdultoMayorImportSummary;
  issues: AdultoMayorImportIssue[];
  expiresAt: Date;
};

export type AdultoMayorImportBatchRowCreateCommand = {
  rowNumber: number;
  status: "ready" | "update_ready" | "unchanged" | "invalid";
  normalizedPayload: AdultoMayorImportNormalizedRow | null;
  issues: AdultoMayorImportIssue[];
  existingAdultoId: string | null;
  existingAdultoUpdatedAt: string | null;
};

export type AdultoMayorImportBatchDetailRowRecord = AdultoMayorImportRow & {
  normalizedPayload: AdultoMayorImportNormalizedRow | null;
  issues: AdultoMayorImportIssue[];
};

export type AdultoMayorImportCommitResult = {
  createdRows: number;
  updatedRows: number;
  unchangedRows: number;
  existingRows: number;
  confirmedAt: Date;
};
