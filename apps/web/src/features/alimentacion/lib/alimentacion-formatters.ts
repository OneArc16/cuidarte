import {
  type AlimentacionOrganizer,
  type AlimentacionStatus,
  alimentacionOrganizerValues,
  alimentacionStatusValues,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";
import { getLocalDateInputValue } from "@/shared/lib/date-input";

const ORGANIZER_LABELS = {
  director: "Director",
  medico: "Medico",
  enfermeria: "Enfermeria",
  psicologa: "Psicologa",
  trabajadora_social: "Trabajadora Social",
  nutricionista: "Nutricionista",
  fisioterapeuta: "Fisioterapeuta",
  recreacionista: "Recreacionista",
} satisfies Record<AlimentacionOrganizer, string>;

const STATUS_LABELS = {
  entregado: "Entregado",
  no_entregado: "No entregado",
  no_aplica: "No aplica",
} satisfies Record<AlimentacionStatus, string>;

export function getAlimentacionOrganizerOptions(): readonly AlimentacionOrganizer[] {
  return alimentacionOrganizerValues;
}

export function getAlimentacionStatusOptions(): readonly AlimentacionStatus[] {
  return alimentacionStatusValues;
}

export function formatAlimentacionOrganizer(value: AlimentacionOrganizer): string {
  return ORGANIZER_LABELS[value];
}

export function formatAlimentacionStatus(value: AlimentacionStatus): string {
  return STATUS_LABELS[value];
}

export function getTodayDateInputValue(): string {
  return getLocalDateInputValue();
}

export function getCurrentMonthInputValue(): string {
  return getTodayDateInputValue().slice(0, 7);
}

export function resolveAlimentacionApiError(error: unknown): string | null {
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
