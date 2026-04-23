import {
  type ActividadGrupalOrganizer,
  type ActividadGrupalType,
  actividadGrupalOrganizerValues,
  actividadGrupalTypeValues,
} from "@cuidarte/contracts";

import { ApiError } from "@/shared/api/api-error";

const TYPE_LABELS = {
  centro_vida: "Centro de Vida",
  actividad_campo: "Actividad de Campo",
  sesiones_psicosocial: "Sesiones Psicosocial",
  salud_preventiva: "Salud Preventiva",
  nutricion: "Nutricion",
  fisioterapia: "Fisioterapia",
  encuentro_intergeneracional: "Encuentro intergeneracional",
  actividades_manualidad: "Actividades de manualidad",
  actividades_recreacion: "Actividades de recreacion",
} satisfies Record<ActividadGrupalType, string>;

const ORGANIZER_LABELS = {
  director: "Director",
  medico: "Medico",
  enfermeria: "Enfermeria",
  psicologa: "Psicologa",
  trabajadora_social: "Trabajadora Social",
  nutricionista: "Nutricionista",
  fisioterapeuta: "Fisioterapeuta",
  recreacionista: "Recreacionista",
} satisfies Record<ActividadGrupalOrganizer, string>;

export function getActividadGrupalTypeOptions(): readonly ActividadGrupalType[] {
  return actividadGrupalTypeValues;
}

export function getActividadGrupalOrganizerOptions(): readonly ActividadGrupalOrganizer[] {
  return actividadGrupalOrganizerValues;
}

export function formatActividadGrupalType(value: ActividadGrupalType): string {
  return TYPE_LABELS[value];
}

export function formatActividadGrupalOrganizer(value: ActividadGrupalOrganizer): string {
  return ORGANIZER_LABELS[value];
}

export function formatActaNumber(value: number): string {
  return String(value).padStart(4, "0");
}

export function formatActivitySchedule(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function resolveActividadesGrupalesApiError(error: unknown): string | null {
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
