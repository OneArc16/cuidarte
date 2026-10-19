export type AlimentacionFilterState = {
  search: string;
  deliveryMonth: string;
  tenantId: string;
};

const STORAGE_KEY_PREFIX = "cuidarte:alimentacion:filters:";

export function loadAlimentacionFilters(
  userId: string,
  fallback: AlimentacionFilterState,
): AlimentacionFilterState {
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
      deliveryMonth: readDeliveryMonth(parsedValue.deliveryMonth, fallback.deliveryMonth),
      tenantId: readUuid(parsedValue.tenantId, fallback.tenantId),
    };
  } catch {
    return fallback;
  }
}

export function saveAlimentacionFilters(userId: string, filters: AlimentacionFilterState): void {
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

function readDeliveryMonth(value: unknown, fallback: string): string {
  return value === "" || (typeof value === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(value))
    ? value
    : fallback;
}

function readUuid(value: unknown, fallback: string): string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
    ? value
    : fallback;
}
