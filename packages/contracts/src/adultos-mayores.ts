import { z } from "zod";

import { type UserRole } from "./auth.js";

export const adultoMayorDocumentTypeSchema = z.enum(["cc", "ce", "passport", "other"]);
export const adultoMayorSexSchema = z.enum(["female", "male", "other"]);
export const adultoMayorZoneSchema = z.enum(["urban", "rural"]);
export const adultoMayorBloodTypeSchema = z.enum([
  "a_positive",
  "a_negative",
  "b_positive",
  "b_negative",
  "ab_positive",
  "ab_negative",
  "o_positive",
  "o_negative",
  "unknown",
]);
export const adultoMayorHealthRegimeSchema = z.string().max(120);

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const nullableTextSchema = (maxLength: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return null;
      }

      const trimmedValue = value.trim();

      return trimmedValue === "" ? null : trimmedValue;
    })
    .pipe(z.string().max(maxLength).nullable());

const nullableEmailSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim().toLowerCase();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.email().max(320).nullable());

const nullableIntegerSchema = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((value, context) => {
    if (value === null || value === undefined) {
      return null;
    }

    if (typeof value === "number") {
      if (Number.isFinite(value)) {
        return value;
      }

      context.addIssue({
        code: "custom",
        message: "Debe ser un numero valido.",
      });

      return z.NEVER;
    }

    const trimmedValue = value.trim();

    if (trimmedValue === "") {
      return null;
    }

    const parsedValue = Number(trimmedValue);

    if (!Number.isFinite(parsedValue)) {
      context.addIssue({
        code: "custom",
        message: "Debe ser un numero valido.",
      });

      return z.NEVER;
    }

    return parsedValue;
  })
  .pipe(z.number().int().min(0).max(999_999_999).nullable());

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const nullableSearchSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.string().max(120).nullable());

export const adultosMayoresImportAccessRoleValues = [
  "super_admin",
  "admin",
  "director",
] as const satisfies readonly UserRole[];

export const adultoMayorImportStatusValues = [
  "ready",
  "validated_with_errors",
  "committing",
  "completed",
  "failed",
  "expired",
] as const;

export const adultoMayorImportRowStatusValues = [
  "ready",
  "update_ready",
  "unchanged",
  "invalid",
  "existing",
] as const;

export const adultoMayorImportIssueSeverityValues = ["error", "warning"] as const;

export const adultoMayorImportIssueCodeValues = [
  "required",
  "invalid_format",
  "invalid_enum",
  "max_length",
  "future_date",
  "unknown_department",
  "unknown_municipality",
  "municipality_department_mismatch",
  "unknown_eps",
  "inactive_eps",
  "duplicate_in_file",
  "already_exists",
  "under_expected_age",
  "formula_not_allowed",
] as const;

export const adultoMayorImportTemplateQuerySchema = z.object({
  tenantId: z.uuid().nullable().optional().default(null),
});

export const adultoMayorImportValidateQuerySchema = z.object({
  tenantId: z.uuid().nullable().optional().default(null),
});

export const adultoMayorImportStatusSchema = z.enum(adultoMayorImportStatusValues);
export const adultoMayorImportRowStatusSchema = z.enum(adultoMayorImportRowStatusValues);
export const adultoMayorImportIssueSeveritySchema = z.enum(adultoMayorImportIssueSeverityValues);
export const adultoMayorImportIssueCodeSchema = z.enum(adultoMayorImportIssueCodeValues);

export const adultoMayorImportTenantSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const adultoMayorImportIssueSchema = z.object({
  rowNumber: z.number().int().positive(),
  column: z.string().min(1).max(80),
  code: adultoMayorImportIssueCodeSchema,
  severity: adultoMayorImportIssueSeveritySchema,
  message: z.string().min(1),
  receivedValue: z.string().max(400).nullable(),
});

export const adultoMayorImportSummarySchema = z.object({
  totalRows: z.number().int().min(0),
  readyRows: z.number().int().min(0),
  updateRows: z.number().int().min(0),
  invalidRows: z.number().int().min(0),
  warningRows: z.number().int().min(0),
  unchangedRows: z.number().int().min(0),
  existingRows: z.number().int().min(0),
  createdRows: z.number().int().min(0),
  updatedRows: z.number().int().min(0),
});

export const adultoMayorImportRowSchema = z.object({
  id: z.uuid(),
  rowNumber: z.number().int().positive(),
  status: adultoMayorImportRowStatusSchema,
  normalizedPayload: z.record(z.string(), z.unknown()).nullable(),
  issues: z.array(adultoMayorImportIssueSchema),
  existingAdultoId: z.uuid().nullable(),
  existingAdultoUpdatedAt: z.string().min(1).nullable(),
  createdAdultoId: z.uuid().nullable(),
  createdAt: z.string().min(1),
});

export const adultoMayorImportDetailSchema = z.object({
  importId: z.uuid(),
  status: adultoMayorImportStatusSchema,
  tenant: adultoMayorImportTenantSchema,
  requestedByUserId: z.uuid(),
  originalFilename: z.string().min(1).max(260),
  fileChecksumSha256: z.string().length(64),
  templateVersion: z.number().int().positive(),
  summary: adultoMayorImportSummarySchema,
  issues: z.array(adultoMayorImportIssueSchema),
  rows: z.array(adultoMayorImportRowSchema),
  canConfirm: z.boolean(),
  expiresAt: z.string().min(1),
  confirmedAt: z.string().min(1).nullable(),
  failureCode: z.string().max(80).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const adultoMayorImportValidateResponseSchema = adultoMayorImportDetailSchema;

export const adultoMayorImportConfirmResponseSchema = z.object({
  importId: z.uuid(),
  status: z.literal("completed"),
  createdRows: z.number().int().min(0),
  updatedRows: z.number().int().min(0),
  unchangedRows: z.number().int().min(0),
  existingRows: z.number().int().min(0),
  completedAt: z.string().min(1),
});

export const adultoMayorImportHistoryItemSchema = z.object({
  importId: z.uuid(),
  status: adultoMayorImportStatusSchema,
  tenant: adultoMayorImportTenantSchema,
  requestedByUserId: z.uuid(),
  originalFilename: z.string().min(1).max(260),
  summary: adultoMayorImportSummarySchema,
  canConfirm: z.boolean(),
  expiresAt: z.string().min(1),
  confirmedAt: z.string().min(1).nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const adultoMayorListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
});

export const adultoMayorTenantOptionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const adultoMayorListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  documentType: adultoMayorDocumentTypeSchema,
  documentNumber: z.string().min(1).max(80),
  names: z.string().min(1).max(180),
  surnames: z.string().min(1).max(180),
  phone: z.string().max(40).nullable(),
  birthDate: dateSchema,
  age: z.number().int().min(0),
  sex: adultoMayorSexSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const adultoMayorDetailSchema = adultoMayorListItemSchema.extend({
  firstName: z.string().min(1).max(80),
  middleName: z.string().max(80).nullable(),
  firstSurname: z.string().min(1).max(80),
  secondSurname: z.string().max(80).nullable(),
  educationLevel: z.string().max(80).nullable(),
  disability: z.string().max(120).nullable(),
  populationGroup: z.string().max(120).nullable(),
  address: z.string().min(1).max(220),
  departmentId: z.uuid().nullable(),
  municipalityId: z.uuid().nullable(),
  department: z.string().min(1).max(100),
  municipality: z.string().min(1).max(100),
  zone: adultoMayorZoneSchema,
  country: z.string().min(1).max(80),
  phoneSecondary: z.string().max(40).nullable(),
  email: z.email().max(320).nullable(),
  emergencyContactFullName: z.string().max(180).nullable(),
  emergencyContactRelationship: z.string().max(80).nullable(),
  emergencyContactPhone: z.string().max(40).nullable(),
  emergencyContactAddress: z.string().max(220).nullable(),
  bloodType: adultoMayorBloodTypeSchema.nullable(),
  sisben: z.string().max(40).nullable(),
  healthRegime: z.string().max(120).nullable(),
  epsId: z.uuid().nullable(),
  epsName: z.string().max(160).nullable(),
  eps: z.string().max(160).nullable(),
  livesWithSomeone: z.boolean(),
  companion: z.string().max(160).nullable(),
  economicIncome: z.number().int().min(0).max(999_999_999).nullable(),
  socialProgramBeneficiary: z.boolean(),
});

export const adultoMayorCommandSchema = z.object({
  documentType: adultoMayorDocumentTypeSchema,
  documentNumber: requiredTextSchema(80),
  sex: adultoMayorSexSchema,
  firstName: requiredTextSchema(80),
  middleName: nullableTextSchema(80),
  firstSurname: requiredTextSchema(80),
  secondSurname: nullableTextSchema(80),
  birthDate: dateSchema,
  educationLevel: nullableTextSchema(80),
  disability: nullableTextSchema(120),
  populationGroup: nullableTextSchema(120),
  address: requiredTextSchema(220),
  departmentId: z.uuid(),
  municipalityId: z.uuid(),
  zone: adultoMayorZoneSchema,
  country: requiredTextSchema(80).default("Colombia"),
  phone: nullableTextSchema(40),
  phoneSecondary: nullableTextSchema(40),
  email: nullableEmailSchema,
  emergencyContactFullName: nullableTextSchema(180),
  emergencyContactRelationship: nullableTextSchema(80),
  emergencyContactPhone: nullableTextSchema(40),
  emergencyContactAddress: nullableTextSchema(220),
  bloodType: adultoMayorBloodTypeSchema.nullable().optional().default(null),
  sisben: nullableTextSchema(40),
  healthRegime: z.string().trim().max(120).nullable().optional().default(null),
  epsId: z.uuid().nullable().optional().default(null),
  livesWithSomeone: z.boolean(),
  companion: nullableTextSchema(160),
  economicIncome: nullableIntegerSchema,
  socialProgramBeneficiary: z.boolean(),
});

export const createAdultoMayorRequestSchema = adultoMayorCommandSchema.extend({
  tenantId: z.uuid().nullable().optional().default(null),
});

export const updateAdultoMayorRequestSchema = adultoMayorCommandSchema;

export const adultoMayorListResponseSchema = z.object({
  adultosMayores: z.array(adultoMayorListItemSchema),
});

export const adultoMayorDetailResponseSchema = adultoMayorDetailSchema;

export const adultoMayorTenantOptionsResponseSchema = z.object({
  tenants: z.array(adultoMayorTenantOptionSchema),
});

export const adultoMayorImportTemplateResponseSchema = z.object({
  filename: z.string().min(1).max(260),
});

export const adultoMayorImportHistoryResponseSchema = z.object({
  imports: z.array(adultoMayorImportHistoryItemSchema),
});

export type AdultoMayorDocumentType = z.infer<typeof adultoMayorDocumentTypeSchema>;
export type AdultoMayorSex = z.infer<typeof adultoMayorSexSchema>;
export type AdultoMayorZone = z.infer<typeof adultoMayorZoneSchema>;
export type AdultoMayorBloodType = z.infer<typeof adultoMayorBloodTypeSchema>;
export type AdultoMayorHealthRegime = z.infer<typeof adultoMayorHealthRegimeSchema>;
export type AdultoMayorTenantOption = z.infer<typeof adultoMayorTenantOptionSchema>;
export type AdultosMayoresImportAccessRole = (typeof adultosMayoresImportAccessRoleValues)[number];
export type AdultoMayorImportStatus = z.infer<typeof adultoMayorImportStatusSchema>;
export type AdultoMayorImportRowStatus = z.infer<typeof adultoMayorImportRowStatusSchema>;
export type AdultoMayorImportIssueSeverity = z.infer<typeof adultoMayorImportIssueSeveritySchema>;
export type AdultoMayorImportIssueCode = z.infer<typeof adultoMayorImportIssueCodeSchema>;
export type AdultoMayorImportTenant = z.infer<typeof adultoMayorImportTenantSchema>;
export type AdultoMayorImportIssue = z.infer<typeof adultoMayorImportIssueSchema>;
export type AdultoMayorImportSummary = z.infer<typeof adultoMayorImportSummarySchema>;
export type AdultoMayorImportRow = z.infer<typeof adultoMayorImportRowSchema>;
export type AdultoMayorImportDetail = z.infer<typeof adultoMayorImportDetailSchema>;
export type AdultoMayorImportValidateResponse = z.infer<
  typeof adultoMayorImportValidateResponseSchema
>;
export type AdultoMayorImportConfirmResponse = z.infer<
  typeof adultoMayorImportConfirmResponseSchema
>;
export type AdultoMayorImportHistoryItem = z.infer<typeof adultoMayorImportHistoryItemSchema>;
export type AdultoMayorImportHistoryResponse = z.infer<
  typeof adultoMayorImportHistoryResponseSchema
>;
export type AdultoMayorImportTemplateResponse = z.infer<
  typeof adultoMayorImportTemplateResponseSchema
>;
export type AdultoMayorImportTemplateQuery = z.infer<typeof adultoMayorImportTemplateQuerySchema>;
export type AdultoMayorImportValidateQuery = z.infer<typeof adultoMayorImportValidateQuerySchema>;
export type AdultoMayorListQuery = z.infer<typeof adultoMayorListQuerySchema>;
export type AdultoMayorListItem = z.infer<typeof adultoMayorListItemSchema>;
export type AdultoMayorDetail = z.infer<typeof adultoMayorDetailSchema>;
export type CreateAdultoMayorRequest = z.infer<typeof createAdultoMayorRequestSchema>;
export type UpdateAdultoMayorRequest = z.infer<typeof updateAdultoMayorRequestSchema>;
export type AdultoMayorListResponse = z.infer<typeof adultoMayorListResponseSchema>;
export type AdultoMayorDetailResponse = z.infer<typeof adultoMayorDetailResponseSchema>;
export type AdultoMayorTenantOptionsResponse = z.infer<
  typeof adultoMayorTenantOptionsResponseSchema
>;
