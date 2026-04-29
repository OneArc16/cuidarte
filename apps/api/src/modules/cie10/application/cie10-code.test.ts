import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { normalizeCie10Code } from "./cie10-code";

describe("normalizeCie10Code", () => {
  it("normalizes compact codes to dotted format", () => {
    assert.equal(normalizeCie10Code("g560"), "G56.0");
    assert.equal(normalizeCie10Code("z1234"), "Z12.34");
  });

  it("preserves dotted codes while standardizing whitespace and case", () => {
    assert.equal(normalizeCie10Code(" g56.0 "), "G56.0");
    assert.equal(normalizeCie10Code("i10"), "I10");
  });
});
