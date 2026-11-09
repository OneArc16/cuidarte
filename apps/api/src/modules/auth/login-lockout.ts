export const MAX_FAILED_LOGIN_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 3;
/** Failures closer together than this count as consecutive. */
export const FAILED_LOGIN_WINDOW_MINUTES = 15;

const LOCK_DURATION_MS = LOGIN_LOCK_MINUTES * 60_000;
const FAILURE_WINDOW_MS = FAILED_LOGIN_WINDOW_MINUTES * 60_000;

export type LoginLockState = {
  failedLoginAttempts: number;
  lastFailedLoginAt: Date | null;
  lockedUntil: Date | null;
};

/**
 * Only consecutive failures count: a failure older than the failure window, or one followed
 * by an expired lock, starts the counter again. This still stops password guessing (five
 * quick attempts lock the account) without punishing a typo from days ago.
 */
export function registerFailedLoginAttempt(state: LoginLockState, now: Date): LoginLockState {
  const lockExpired = state.lockedUntil !== null && state.lockedUntil <= now;
  const lastFailureIsRecent =
    state.lastFailedLoginAt !== null &&
    now.getTime() - state.lastFailedLoginAt.getTime() <= FAILURE_WINDOW_MS;
  const previousAttempts = lockExpired || !lastFailureIsRecent ? 0 : state.failedLoginAttempts;
  const failedLoginAttempts = previousAttempts + 1;

  return {
    failedLoginAttempts,
    lastFailedLoginAt: now,
    lockedUntil:
      failedLoginAttempts >= MAX_FAILED_LOGIN_ATTEMPTS
        ? new Date(now.getTime() + LOCK_DURATION_MS)
        : null,
  };
}

/** Whole minutes (rounded up) until the account unlocks, or null when it is not locked. */
export function getLoginLockMinutesLeft(
  state: Pick<LoginLockState, "lockedUntil">,
  now: Date,
): number | null {
  if (state.lockedUntil === null || state.lockedUntil <= now) {
    return null;
  }

  return Math.ceil((state.lockedUntil.getTime() - now.getTime()) / 60_000);
}
