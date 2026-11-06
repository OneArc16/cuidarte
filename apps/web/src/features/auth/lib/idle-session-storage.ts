const LAST_ACTIVITY_KEY = "cuidarte:last-activity-at";
const LAST_HEARTBEAT_KEY = "cuidarte:last-activity-heartbeat-at";
const LOGOUT_REASON_KEY = "cuidarte:logout-reason";

export type LogoutReason = "idle";

// Activity timestamps live in localStorage so every open tab shares the same idle clock.
// Storage can be unavailable (private mode, blocked site data); in-memory values keep
// the current tab working in that case.
const memoryFallback = new Map<string, number>();

function readTimestamp(key: string): number | null {
  let value: string | null;

  try {
    value = window.localStorage.getItem(key);
  } catch {
    return memoryFallback.get(key) ?? null;
  }

  const parsed = value === null ? Number.NaN : Number(value);

  return Number.isFinite(parsed) ? parsed : null;
}

function writeTimestamp(key: string, value: number) {
  memoryFallback.set(key, value);

  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // The in-memory value already holds it.
  }
}

export function readLastActivityAt(): number | null {
  return readTimestamp(LAST_ACTIVITY_KEY);
}

export function writeLastActivityAt(value: number) {
  writeTimestamp(LAST_ACTIVITY_KEY, value);
}

export function readLastHeartbeatAt(): number | null {
  return readTimestamp(LAST_HEARTBEAT_KEY);
}

export function writeLastHeartbeatAt(value: number) {
  writeTimestamp(LAST_HEARTBEAT_KEY, value);
}

export function rememberLogoutReason(reason: LogoutReason) {
  try {
    window.sessionStorage.setItem(LOGOUT_REASON_KEY, reason);
  } catch {
    // The login notice is a convenience; losing it is harmless.
  }
}

export function consumeLogoutReason(): LogoutReason | null {
  try {
    const reason = window.sessionStorage.getItem(LOGOUT_REASON_KEY);
    window.sessionStorage.removeItem(LOGOUT_REASON_KEY);

    return reason === "idle" ? reason : null;
  } catch {
    return null;
  }
}
