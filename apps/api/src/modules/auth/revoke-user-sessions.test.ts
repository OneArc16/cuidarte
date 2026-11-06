import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { drizzle } from "drizzle-orm/postgres-js";

import * as schema from "../../database/schema";
import { buildRevokeActiveUserSessionsQuery } from "./revoke-user-sessions";

describe("buildRevokeActiveUserSessionsQuery", () => {
  it("revokes only the active sessions of the given user", () => {
    const db = drizzle.mock({ schema });
    const revokedAt = new Date("2026-11-06T12:00:00.000Z");

    const query = buildRevokeActiveUserSessionsQuery(
      db,
      "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      revokedAt,
    ).toSQL();

    assert.equal(
      query.sql,
      'update "user_sessions" set "revoked_at" = $1 where ("user_sessions"."user_id" = $2 and "user_sessions"."revoked_at" is null)',
    );
    assert.deepEqual(query.params, [
      revokedAt.toISOString(),
      "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    ]);
  });
});
