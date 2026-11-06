type SessionActivity = {
  lastUsedAt: Date | null;
  createdAt: Date;
};

/**
 * A session is idle when no user activity was registered within the timeout.
 * `lastUsedAt` is only refreshed by explicit activity heartbeats, never by
 * background polling, so an open but untouched tab still expires.
 */
export function isSessionIdle(
  session: SessionActivity,
  now: Date,
  idleTimeoutMinutes: number,
): boolean {
  const lastActivityAt = session.lastUsedAt ?? session.createdAt;

  return now.getTime() - lastActivityAt.getTime() >= idleTimeoutMinutes * 60_000;
}
