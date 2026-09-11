import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertReportStatusTransition } from "./report-status";

describe("report-status", () => {
  it("allows the expected lifecycle transitions", () => {
    assert.doesNotThrow(() => assertReportStatusTransition("pending", "processing"));
    assert.doesNotThrow(() => assertReportStatusTransition("processing", "ready"));
    assert.doesNotThrow(() => assertReportStatusTransition("ready", "expired"));
  });

  it("rejects invalid lifecycle transitions", () => {
    assert.throws(() => assertReportStatusTransition("ready", "processing"));
    assert.throws(() => assertReportStatusTransition("failed", "ready"));
  });
});
