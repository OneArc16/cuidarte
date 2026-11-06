import { and, eq, isNull } from "drizzle-orm";

import { type AppDatabase } from "../../database/database.service";
import { userSessions } from "../../database/schema";

type SessionWriter = Pick<AppDatabase, "update">;

export function buildRevokeActiveUserSessionsQuery(
  executor: SessionWriter,
  userId: string,
  revokedAt: Date,
) {
  return executor
    .update(userSessions)
    .set({ revokedAt })
    .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
}

/**
 * Revokes every active session of a user. Call it inside the same transaction that
 * changes the user's credentials so a stolen or stale cookie stops working immediately.
 */
export async function revokeActiveUserSessions(
  executor: SessionWriter,
  userId: string,
  revokedAt: Date,
): Promise<void> {
  await buildRevokeActiveUserSessionsQuery(executor, userId, revokedAt);
}
