import {
  type AdultoMayorBloodType,
  type AdultoMayorDetail,
  type CreateAdultoMayorRequest,
  type UpdateAdultoMayorRequest,
  adultoMayorBloodTypeSchema,
  adultoMayorDocumentTypeSchema,
  adultoMayorSexSchema,
  adultoMayorZoneSchema,
  createAdultoMayorRequestSchema,
  updateAdultoMayorRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { resolveHealthRegimeFormValue } from "../lib/health-regime-options";

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
  departmentId: z.uuid({ message: "Selecciona un departamento de la lista." }),
  municipalityId: z.uuid({ message: "Selecciona un municipio de la lista." }),
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
  healthRegime: optionalFormTextSchema(120),
  epsId: z.union([z.literal(""), z.uuid({ message: "Selecciona una EPS de la lista." })]),
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
  "bloodType" | "economicIncome" | "epsId" | "healthRegime"
> & {
  tenantId: string;
  bloodType: AdultoMayorBloodType | "";
  economicIncome: string;
  epsId: string;
  healthRegime: string;
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
    departmentId: "",
    municipalityId: "",
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
    epsId: "",
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
    departmentId: detail.departmentId ?? "",
    municipalityId: detail.municipalityId ?? "",
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
    healthRegime: resolveHealthRegimeFormValue(detail.healthRegime),
    epsId: detail.epsId ?? "",
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
    epsId: toNullableValue(values.epsId),
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
    epsId: toNullableValue(values.epsId),
  });
}

function toNullableValue<T extends string>(value: T | ""): T | null {
  return value === "" ? null : value;
}
