import {
  type AdultoMayorImportExistingAdultRecord,
  type AdultoMayorImportNormalizedRow,
  type AdultoMayorImportRowInput,
} from "./adulto-mayor-import.types";

export const ADULTO_MAYOR_IMPORT_MUTABLE_FIELDS = [
  "firstName",
  "middleName",
  "firstSurname",
  "secondSurname",
  "birthDate",
  "sex",
  "status",
  "deathDate",
  "educationLevel",
  "disability",
  "populationGroup",
  "address",
  "departmentId",
  "municipalityId",
  "department",
  "municipality",
  "zone",
  "country",
  "phone",
  "phoneSecondary",
  "email",
  "emergencyContactFullName",
  "emergencyContactRelationship",
  "emergencyContactPhone",
  "emergencyContactAddress",
  "bloodType",
  "sisben",
  "healthRegime",
  "epsId",
  "eps",
  "livesWithSomeone",
  "companion",
  "economicIncome",
  "socialProgramBeneficiary",
] as const satisfies readonly (keyof AdultoMayorImportNormalizedRow)[];

export type AdultoMayorImportMutableField = (typeof ADULTO_MAYOR_IMPORT_MUTABLE_FIELDS)[number];

export function mergeAdultoMayorImportUpdate(
  imported: AdultoMayorImportNormalizedRow,
  existing: AdultoMayorImportExistingAdultRecord,
  source: AdultoMayorImportRowInput,
): AdultoMayorImportNormalizedRow {
  const preserveBlank = <Field extends keyof AdultoMayorImportNormalizedRow>(
    field: Field,
    column: string,
  ): AdultoMayorImportNormalizedRow[Field] =>
    isBlank(source.values[column])
      ? (existing[field] as AdultoMayorImportNormalizedRow[Field])
      : imported[field];

  return {
    ...imported,
    status: preserveBlank("status", "estado"),
    middleName: preserveBlank("middleName", "segundo_nombre"),
    secondSurname: preserveBlank("secondSurname", "segundo_apellido"),
    educationLevel: preserveBlank("educationLevel", "nivel_academico"),
    disability: preserveBlank("disability", "discapacidad"),
    populationGroup: preserveBlank("populationGroup", "grupo_poblacional"),
    country: preserveBlank("country", "pais"),
    phone: preserveBlank("phone", "telefono"),
    phoneSecondary: preserveBlank("phoneSecondary", "telefono_secundario"),
    email: preserveBlank("email", "correo"),
    emergencyContactFullName: preserveBlank(
      "emergencyContactFullName",
      "contacto_emergencia_nombre",
    ),
    emergencyContactRelationship: preserveBlank(
      "emergencyContactRelationship",
      "contacto_emergencia_parentesco",
    ),
    emergencyContactPhone: preserveBlank("emergencyContactPhone", "contacto_emergencia_telefono"),
    emergencyContactAddress: preserveBlank(
      "emergencyContactAddress",
      "contacto_emergencia_direccion",
    ),
    bloodType: preserveBlank("bloodType", "tipo_sangre"),
    sisben: preserveBlank("sisben", "sisben"),
    healthRegime: preserveBlank("healthRegime", "regimen_salud"),
    epsId: preserveBlank("epsId", "codigo_eps"),
    eps: preserveBlank("eps", "codigo_eps"),
    companion: preserveBlank("companion", "acompanante"),
    economicIncome: preserveBlank("economicIncome", "ingreso_economico"),
  };
}

export function getAdultoMayorImportChangedFields(
  existing: AdultoMayorImportExistingAdultRecord,
  desired: AdultoMayorImportNormalizedRow,
): AdultoMayorImportMutableField[] {
  return ADULTO_MAYOR_IMPORT_MUTABLE_FIELDS.filter((field) => existing[field] !== desired[field]);
}

export function buildAdultoMayorImportChanges(
  existing: AdultoMayorImportExistingAdultRecord,
  desired: AdultoMayorImportNormalizedRow,
): Record<string, { before: unknown; after: unknown }> {
  return Object.fromEntries(
    getAdultoMayorImportChangedFields(existing, desired).map((field) => [
      field,
      { before: existing[field], after: desired[field] },
    ]),
  );
}

function isBlank(value: string | null | undefined): boolean {
  return value === null || value === undefined || value.trim() === "";
}
