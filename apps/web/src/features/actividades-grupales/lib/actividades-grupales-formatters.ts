import {
  type ActividadGrupalOrganizer,
  type ActividadGrupalResponsibleDepartment,
  type ActividadGrupalType,
  actividadGrupalOrganizerValues,
  actividadGrupalResponsibleDepartmentValues,
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

const ORGANIZER_FILTER_OPTIONS: readonly {
  value: ActividadGrupalOrganizer;
  label: string;
}[] = [
  { value: "director", label: "Director" },
  { value: "medico", label: "SALUD — Médico y Enfermería" },
  { value: "psicologa", label: "PSICO — Psicología y Trabajo Social" },
  { value: "nutricionista", label: "Nutricionista" },
  { value: "fisioterapeuta", label: "Fisioterapeuta" },
  { value: "recreacionista", label: "Recreacionista" },
];

const RESPONSIBLE_DEPARTMENT_LABELS = {
  direccion: "Direccion",
  medicina: "Medicina",
  enfermeria: "Enfermeria",
  psicologia: "Psicologia",
  trabajo_social: "Trabajo Social",
  nutricion: "Nutricion",
  fisioterapia: "Fisioterapia",
  recreacion: "Recreacion",
} satisfies Record<ActividadGrupalResponsibleDepartment, string>;

export function getActividadGrupalTypeOptions(): readonly ActividadGrupalType[] {
  return actividadGrupalTypeValues;
}

export function getActividadGrupalOrganizerOptions(): readonly ActividadGrupalOrganizer[] {
  return actividadGrupalOrganizerValues;
}

export function getActividadGrupalOrganizerFilterOptions(): readonly {
  value: ActividadGrupalOrganizer;
  label: string;
}[] {
  return ORGANIZER_FILTER_OPTIONS;
}

export function getActividadGrupalResponsibleDepartmentOptions(): readonly ActividadGrupalResponsibleDepartment[] {
  return actividadGrupalResponsibleDepartmentValues;
}

export function formatActividadGrupalType(value: ActividadGrupalType): string {
  return TYPE_LABELS[value];
}

export function formatActividadGrupalOrganizer(value: ActividadGrupalOrganizer): string {
  return ORGANIZER_LABELS[value];
}

export function formatActividadGrupalResponsibleDepartment(
  value: ActividadGrupalResponsibleDepartment,
): string {
  return RESPONSIBLE_DEPARTMENT_LABELS[value];
}

export function formatActaNumber(value: number | string): string {
  const normalizedValue = String(value).trim();

  if (/^\d+$/.test(normalizedValue)) {
    return normalizedValue.padStart(4, "0");
  }

  return normalizedValue;
}

export function formatActivitySchedule(startTime: string, endTime: string): string {
  return `${startTime} - ${endTime}`;
}

export function formatActividadGrupalTimestamp(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatActividadGrupalTrashTimestamp(value: string): string {
  return formatActividadGrupalTimestamp(value);
}

export function formatActividadGrupalFileSize(sizeBytes: number): string {
  if (sizeBytes >= 1024 * 1024) {
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
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
