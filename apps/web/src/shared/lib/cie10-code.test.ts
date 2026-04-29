import { describe, expect, it } from "vitest";

import { normalizeCie10Code } from "./cie10-code";

describe("normalizeCie10Code", () => {
  it("normalizes compact CIE-10 values to a dotted format", () => {
    expect(normalizeCie10Code("g560")).toBe("G56.0");
    expect(normalizeCie10Code("z1234")).toBe("Z12.34");
  });

  it("keeps already dotted values while standardizing case", () => {
    expect(normalizeCie10Code("g56.0")).toBe("G56.0");
    expect(normalizeCie10Code(" I10 ")).toBe("I10");
  });
});
