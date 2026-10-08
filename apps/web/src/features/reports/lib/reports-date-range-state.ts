export type ReportsDateRange = {
  from: string;
  to: string;
};

const STORAGE_KEY_PREFIX = "cuidarte:reports:date-range:";
const DATE_PATTERN = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export function loadReportsDateRange(userId: string, fallback: ReportsDateRange): ReportsDateRange {
  try {
    const rawValue = window.sessionStorage.getItem(buildStorageKey(userId));

    if (rawValue === null) {
      return fallback;
    }

    const parsedValue: unknown = JSON.parse(rawValue);

    if (!isReportsDateRange(parsedValue)) {
      return fallback;
    }

    return parsedValue;
  } catch {
    return fallback;
  }
}

export function saveReportsDateRange(userId: string, dateRange: ReportsDateRange): void {
  try {
    window.sessionStorage.setItem(buildStorageKey(userId), JSON.stringify(dateRange));
  } catch {
    // La persistencia del filtro es opcional y no debe bloquear los reportes.
  }
}

function buildStorageKey(userId: string): string {
  return `${STORAGE_KEY_PREFIX}${userId}`;
}

function isReportsDateRange(value: unknown): value is ReportsDateRange {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const { from, to } = value as Record<string, unknown>;

  return (
    typeof from === "string" &&
    typeof to === "string" &&
    DATE_PATTERN.test(from) &&
    DATE_PATTERN.test(to) &&
    from <= to
  );
}
