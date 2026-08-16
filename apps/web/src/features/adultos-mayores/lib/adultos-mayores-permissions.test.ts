import { describe, expect, it } from "vitest";

import { canImportAdultosMayores, canManageAdultosMayores } from "./adultos-mayores-permissions";

describe("adultos mayores permissions", () => {
  it("blocks auditor users from write actions", () => {
    expect(canManageAdultosMayores({ role: "auditor" })).toBe(false);
    expect(canManageAdultosMayores({ role: "admin" })).toBe(true);
    expect(canManageAdultosMayores({ role: "director" })).toBe(true);
  });

  it("allows director users to import adults within their tenant scope", () => {
    expect(canImportAdultosMayores({ role: "auditor" })).toBe(false);
    expect(canImportAdultosMayores({ role: "admin" })).toBe(true);
    expect(canImportAdultosMayores({ role: "director" })).toBe(true);
    expect(canImportAdultosMayores({ role: "super_admin" })).toBe(true);
  });
});
