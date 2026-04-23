import { z } from "zod";

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
export const adultoMayorHealthRegimeSchema = z.enum([
  "contributory",
  "subsidized",
  "special",
  "exception",
  "uninsured",
  "unknown",
]);

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
  healthRegime: adultoMayorHealthRegimeSchema.nullable(),
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
  department: requiredTextSchema(100),
  municipality: requiredTextSchema(100),
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
  healthRegime: adultoMayorHealthRegimeSchema.nullable().optional().default(null),
  eps: nullableTextSchema(160),
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

export type AdultoMayorDocumentType = z.infer<typeof adultoMayorDocumentTypeSchema>;
export type AdultoMayorSex = z.infer<typeof adultoMayorSexSchema>;
export type AdultoMayorZone = z.infer<typeof adultoMayorZoneSchema>;
export type AdultoMayorBloodType = z.infer<typeof adultoMayorBloodTypeSchema>;
export type AdultoMayorHealthRegime = z.infer<typeof adultoMayorHealthRegimeSchema>;
export type AdultoMayorTenantOption = z.infer<typeof adultoMayorTenantOptionSchema>;
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
