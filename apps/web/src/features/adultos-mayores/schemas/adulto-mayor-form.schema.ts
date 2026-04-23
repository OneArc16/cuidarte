import {
  type AdultoMayorBloodType,
  type AdultoMayorDetail,
  type AdultoMayorHealthRegime,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
  adultoMayorBloodTypeSchema,
  adultoMayorDocumentTypeSchema,
  adultoMayorHealthRegimeSchema,
  adultoMayorSexSchema,
  adultoMayorZoneSchema,
  createAdultoMayorRequestSchema,
  updateAdultoMayorRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

type AdultoMayorCommandInput = z.input<typeof updateAdultoMayorRequestSchema>;
const requiredFormTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const optionalFormTextSchema = (maxLength: number) => z.string().trim().max(maxLength);

export const adultoMayorFormSchema = z.object({
  tenantId: z.string().trim(),
  documentType: adultoMayorDocumentTypeSchema,
  documentNumber: requiredFormTextSchema(80),
  sex: adultoMayorSexSchema,
  firstName: requiredFormTextSchema(80),
  middleName: optionalFormTextSchema(80),
  firstSurname: requiredFormTextSchema(80),
  secondSurname: optionalFormTextSchema(80),
  birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  educationLevel: optionalFormTextSchema(80),
  disability: optionalFormTextSchema(120),
  populationGroup: optionalFormTextSchema(120),
  address: requiredFormTextSchema(220),
  department: requiredFormTextSchema(100),
  municipality: requiredFormTextSchema(100),
  zone: adultoMayorZoneSchema,
  country: requiredFormTextSchema(80),
  phone: optionalFormTextSchema(40),
  phoneSecondary: optionalFormTextSchema(40),
  email: z.union([z.literal(""), z.email().max(320)]),
  emergencyContactFullName: optionalFormTextSchema(180),
  emergencyContactRelationship: optionalFormTextSchema(80),
  emergencyContactPhone: optionalFormTextSchema(40),
  emergencyContactAddress: optionalFormTextSchema(220),
  bloodType: z.union([adultoMayorBloodTypeSchema, z.literal("")]),
  sisben: optionalFormTextSchema(40),
  healthRegime: z.union([adultoMayorHealthRegimeSchema, z.literal("")]),
  eps: optionalFormTextSchema(160),
  livesWithSomeone: z.boolean(),
  companion: optionalFormTextSchema(160),
  economicIncome: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+$/.test(value), {
      message: "Debe ser un numero valido.",
    }),
  socialProgramBeneficiary: z.boolean(),
});

export type AdultoMayorFormValues = Omit<
  AdultoMayorCommandInput,
  "bloodType" | "economicIncome" | "healthRegime"
> & {
  tenantId: string;
  bloodType: AdultoMayorBloodType | "";
  economicIncome: string;
  healthRegime: AdultoMayorHealthRegime | "";
};

export function createDefaultAdultoMayorFormValues(): AdultoMayorFormValues {
  return {
    tenantId: "",
    documentType: "cc",
    documentNumber: "",
    sex: "female",
    firstName: "",
    middleName: "",
    firstSurname: "",
    secondSurname: "",
    birthDate: "",
    educationLevel: "",
    disability: "",
    populationGroup: "",
    address: "",
    department: "",
    municipality: "",
    zone: "urban",
    country: "Colombia",
    phone: "",
    phoneSecondary: "",
    email: "",
    emergencyContactFullName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    emergencyContactAddress: "",
    bloodType: "",
    sisben: "",
    healthRegime: "",
    eps: "",
    livesWithSomeone: false,
    companion: "",
    economicIncome: "",
    socialProgramBeneficiary: false,
  };
}

export function toAdultoMayorFormValues(detail: AdultoMayorDetail): AdultoMayorFormValues {
  return {
    tenantId: detail.tenantId,
    documentType: detail.documentType,
    documentNumber: detail.documentNumber,
    sex: detail.sex,
    firstName: detail.firstName,
    middleName: detail.middleName ?? "",
    firstSurname: detail.firstSurname,
    secondSurname: detail.secondSurname ?? "",
    birthDate: detail.birthDate,
    educationLevel: detail.educationLevel ?? "",
    disability: detail.disability ?? "",
    populationGroup: detail.populationGroup ?? "",
    address: detail.address,
    department: detail.department,
    municipality: detail.municipality,
    zone: detail.zone,
    country: detail.country,
    phone: detail.phone ?? "",
    phoneSecondary: detail.phoneSecondary ?? "",
    email: detail.email ?? "",
    emergencyContactFullName: detail.emergencyContactFullName ?? "",
    emergencyContactRelationship: detail.emergencyContactRelationship ?? "",
    emergencyContactPhone: detail.emergencyContactPhone ?? "",
    emergencyContactAddress: detail.emergencyContactAddress ?? "",
    bloodType: detail.bloodType ?? "",
    sisben: detail.sisben ?? "",
    healthRegime: detail.healthRegime ?? "",
    eps: detail.eps ?? "",
    livesWithSomeone: detail.livesWithSomeone,
    companion: detail.companion ?? "",
    economicIncome: detail.economicIncome === null ? "" : String(detail.economicIncome),
    socialProgramBeneficiary: detail.socialProgramBeneficiary,
  };
}

export function toCreateAdultoMayorRequest(
  values: AdultoMayorFormValues,
): CreateAdultoMayorRequest {
  return createAdultoMayorRequestSchema.parse({
    ...values,
    tenantId: toNullableValue(values.tenantId),
    bloodType: toNullableValue(values.bloodType),
    healthRegime: toNullableValue(values.healthRegime),
  });
}

export function toUpdateAdultoMayorRequest(
  values: AdultoMayorFormValues,
): UpdateAdultoMayorRequest {
  const { tenantId: _tenantId, ...commandValues } = values;

  return updateAdultoMayorRequestSchema.parse({
    ...commandValues,
    bloodType: toNullableValue(values.bloodType),
    healthRegime: toNullableValue(values.healthRegime),
  });
}

function toNullableValue<T extends string>(value: T | ""): T | null {
  return value === "" ? null : value;
}
