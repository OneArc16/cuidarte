import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { isSessionIdle } from "./session-idle";

const createdAt = new Date("2026-11-06T08:00:00.000Z");

describe("isSessionIdle", () => {
  it("keeps a session active while the last activity is within the timeout", () => {
    const session = { createdAt, lastUsedAt: new Date("2026-11-06T09:00:00.000Z") };

    assert.equal(isSessionIdle(session, new Date("2026-11-06T09:29:59.000Z"), 30), false);
  });

  it("expires a session once the timeout elapses since the last activity", () => {
    const session = { createdAt, lastUsedAt: new Date("2026-11-06T09:00:00.000Z") };

    assert.equal(isSessionIdle(session, new Date("2026-11-06T09:30:00.000Z"), 30), true);
  });

  it("falls back to the creation date when no activity was registered", () => {
    const session = { createdAt, lastUsedAt: null };

    assert.equal(isSessionIdle(session, new Date("2026-11-06T08:29:00.000Z"), 30), false);
    assert.equal(isSessionIdle(session, new Date("2026-11-06T08:30:00.000Z"), 30), true);
  });
});
