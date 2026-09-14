import {
  type ActividadGrupalOrganizer,
  type ActividadGrupalType,
  actividadGrupalOrganizerValues,
  actividadGrupalTypeValues,
} from "@cuidarte/contracts";

export type ActividadesGrupalesFilterState = {
  search: string;
  activityMonth: string;
  activityType: ActividadGrupalType | "";
  activityTypeId: string;
  organizer: ActividadGrupalOrganizer | "";
  tenantId: string;
};

const STORAGE_KEY_PREFIX = "cuidarte:actividades-grupales:filters:";

export function loadActividadesGrupalesFilters(
  userId: string,
  fallback: ActividadesGrupalesFilterState,
): ActividadesGrupalesFilterState {
  try {
    const rawValue = window.sessionStorage.getItem(buildStorageKey(userId));

    if (rawValue === null) {
      return fallback;
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isRecord(parsedValue)) {
      return fallback;
    }

    return {
      search: readString(parsedValue.search, fallback.search),
      activityMonth: readActivityMonth(parsedValue.activityMonth, fallback.activityMonth),
      activityType: readEnum(parsedValue.activityType, actividadGrupalTypeValues),
      activityTypeId: readUuid(parsedValue.activityTypeId, fallback.activityTypeId),
      organizer: readEnum(parsedValue.organizer, actividadGrupalOrganizerValues),
      tenantId: readString(parsedValue.tenantId, fallback.tenantId),
    };
  } catch {
    return fallback;
  }
}

export function saveActividadesGrupalesFilters(
  userId: string,
  filters: ActividadesGrupalesFilterState,
): void {
  try {
    window.sessionStorage.setItem(buildStorageKey(userId), JSON.stringify(filters));
  } catch {
    // La persistencia de filtros es opcional y no debe bloquear el listado.
  }
}

function buildStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}

function readActivityMonth(value: unknown, fallback: string): string {
  if (value === "" || (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value))) {
    return value;
  }

  return fallback;
}

function readUuid(value: unknown, fallback: string): string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : fallback;
}

function readEnum<T extends string>(value: unknown, allowedValues: readonly T[]): T | "" {
  return typeof value === "string" && allowedValues.includes(value as T) ? (value as T) : "";
}
