import {
  type AdultoMayorBloodType,
  type AdultoMayorDocumentType,
  type AdultoMayorHealthRegime,
  type AdultoMayorSex,
  type AdultoMayorZone,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";

const DOCUMENT_TYPE_LABELS = {
  cc: "CC",
  ce: "CE",
  passport: "Pasaporte",
  other: "Otro",
} satisfies Record<AdultoMayorDocumentType, string>;

const SEX_LABELS = {
  female: "Femenino",
  male: "Masculino",
  other: "Otro",
} satisfies Record<AdultoMayorSex, string>;

const ZONE_LABELS = {
  urban: "Urbana",
  rural: "Rural",
} satisfies Record<AdultoMayorZone, string>;

const BLOOD_TYPE_LABELS = {
  a_positive: "A+",
  a_negative: "A-",
  b_positive: "B+",
  b_negative: "B-",
  ab_positive: "AB+",
  ab_negative: "AB-",
  o_positive: "O+",
  o_negative: "O-",
  unknown: "No sabe",
} satisfies Record<AdultoMayorBloodType, string>;

const HEALTH_REGIME_LABELS: Record<string, string> = {
  contributory: "Contributivo cotizante",
  subsidized: "Subsidiado",
  special: "Especial o Excepción cotizante",
  exception: "Especial o Excepción beneficiario",
  uninsured: "No afiliado",
  unknown: "Ninguno",
  "contributory-additional": "Contributivo adicional",
  "contributory-beneficiary": "Contributivo beneficiario",
  "arl-protected": "Tomador / Amparado ARL",
  "soat-protected": "Tomador / Amparado SOAT",
  "voluntary-health-plans": "Tomador / Amparado Planes voluntarios de salud",
  particular: "Particular",
  "prisoners-covered-by-national-health-fund":
    "Personas privadas de la libertad a cargo del Fondo Nacional de Salud",
  "Especial o Excepción cotizante": "Especial o Excepción cotizante",
  "Especial o Excepción beneficiario": "Especial o Excepción beneficiario",
  "Contributivo cotizante": "Contributivo cotizante",
  "Contributivo adicional": "Contributivo adicional",
  "Contributivo beneficiario": "Contributivo beneficiario",
  "Subsidiado": "Subsidiado",
  "No afiliado": "No afiliado",
  "Tomador / Amparado ARL": "Tomador / Amparado ARL",
  "Tomador / Amparado SOAT": "Tomador / Amparado SOAT",
  "Tomador / Amparado Planes voluntarios de salud":
    "Tomador / Amparado Planes voluntarios de salud",
  Particular: "Particular",
  "Personas privadas de la libertad a cargo del Fondo Nacional de Salud":
    "Personas privadas de la libertad a cargo del Fondo Nacional de Salud",
};

export function formatAdultoMayorDocument(
  documentType: AdultoMayorDocumentType,
  documentNumber: string,
): string {
  return `${DOCUMENT_TYPE_LABELS[documentType]} ${documentNumber}`;
}

export function formatAdultoMayorSex(sex: AdultoMayorSex): string {
  return SEX_LABELS[sex];
}

export function formatAdultoMayorZone(zone: AdultoMayorZone): string {
  return ZONE_LABELS[zone];
}

export function formatAdultoMayorBloodType(bloodType: AdultoMayorBloodType): string {
  return BLOOD_TYPE_LABELS[bloodType];
}

export function formatAdultoMayorHealthRegime(regime: AdultoMayorHealthRegime): string {
  return HEALTH_REGIME_LABELS[regime] ?? regime;
}

export function formatAdultoMayorPhone(phone: string | null): string {
  return phone ?? "Sin telefono";
}

export function resolveAdultosMayoresApiError(error: unknown): string | null {
  if (error === null) {
    return null;
  }

  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return "No fue posible completar la solicitud.";
  }

  return null;
}
