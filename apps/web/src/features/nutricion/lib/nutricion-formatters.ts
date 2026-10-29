import {
  type NutricionFollowUpAdherence,
  type NutricionMealSlot,
  type NutricionPlanStatus,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";

const PLAN_STATUS_LABELS: Record<NutricionPlanStatus, string> = {
  active: "Activo",
  completed: "Finalizado",
  archived: "Archivado",
};

const MEAL_SLOT_LABELS: Record<NutricionMealSlot, string> = {
  desayuno: "Desayuno",
  media_manana: "Media mañana",
  almuerzo: "Almuerzo",
  media_tarde: "Media tarde",
  cena: "Cena",
  colacion_nocturna: "Colación nocturna",
};

const ADHERENCE_LABELS: Record<NutricionFollowUpAdherence, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
  sin_dato: "Sin dato",
};

const SEX_LABELS: Record<string, string> = {
  female: "Femenino",
  femenino: "Femenino",
  male: "Masculino",
  masculino: "Masculino",
  other: "Otro",
  otro: "Otro",
  not_specified: "Sin especificar",
  sin_especificar: "Sin especificar",
};

export const nutricionMealSlots = Object.keys(MEAL_SLOT_LABELS) as NutricionMealSlot[];

export function formatNutricionPlanStatus(status: NutricionPlanStatus): string {
  return PLAN_STATUS_LABELS[status];
}

export function formatNutricionMealSlot(slot: NutricionMealSlot): string {
  return MEAL_SLOT_LABELS[slot];
}

export function formatNutricionAdherence(adherence: NutricionFollowUpAdherence): string {
  return ADHERENCE_LABELS[adherence];
}

export function formatNutricionSex(sex: string): string {
  return SEX_LABELS[sex.trim().toLowerCase()] ?? sex;
}

export function formatNutricionDate(date: string | null): string {
  if (date === null) {
    return "Sin programar";
  }

  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function resolveNutricionApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "No fue posible completar la operación de nutrición.";
}
