import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveAuditRequestContext } from "./audit-request-context";

describe("resolveAuditRequestContext", () => {
  it("captures the client ip and user agent", () => {
    assert.deepEqual(
      resolveAuditRequestContext({
        ip: "190.85.12.4",
        headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0" },
      }),
      { ip: "190.85.12.4", userAgent: "Mozilla/5.0 (Windows NT 10.0) Chrome/130.0" },
    );
  });

  it("stores missing or blank values as null", () => {
    assert.deepEqual(resolveAuditRequestContext({ ip: "  ", headers: {} }), {
      ip: null,
      userAgent: null,
    });
  });

  it("truncates an oversized user agent", () => {
    const context = resolveAuditRequestContext({
      ip: "10.0.0.1",
      headers: { "user-agent": "x".repeat(2000) },
    });

    assert.equal(context.userAgent?.length, 512);
  });
});
