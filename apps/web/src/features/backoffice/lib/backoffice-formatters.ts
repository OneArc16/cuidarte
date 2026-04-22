import { type TenantDocumentType } from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";

const DOCUMENT_TYPE_LABELS = {
  nit: "NIT",
  cc: "CC",
  ce: "CE",
} satisfies Record<TenantDocumentType, string>;

export function formatDocument(
  documentType: TenantDocumentType,
  documentNumber: string | null,
): string {
  return `${DOCUMENT_TYPE_LABELS[documentType]}${documentNumber === null ? "" : ` ${documentNumber}`}`;
}

export function formatLocation(city: string | null, department: string | null): string {
  const locationParts = [city, department].filter((part): part is string => part !== null);

  return locationParts.length === 0 ? "Sin ubicación" : locationParts.join(", ");
}

export function resolveApiError(error: unknown): string | null {
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
