import { describe, expect, it } from "vitest";

import { calculateImc, formatImcInput } from "./imc";

describe("IMC helpers", () => {
  it("calculates BMI from weight in kg and height in cm", () => {
    expect(calculateImc("70", "175")).toBe(22.86);
    expect(formatImcInput("70", "175")).toBe("22.86");
  });

  it("returns null and empty text when inputs are incomplete", () => {
    expect(calculateImc("", "175")).toBeNull();
    expect(calculateImc("70", "")).toBeNull();
    expect(calculateImc("70", "0")).toBeNull();
    expect(formatImcInput("", "175")).toBe("");
  });
});
