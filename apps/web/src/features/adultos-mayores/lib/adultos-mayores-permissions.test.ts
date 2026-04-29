import { describe, expect, it } from "vitest";

import { canManageAdultosMayores } from "./adultos-mayores-permissions";

describe("adultos mayores permissions", () => {
  it("blocks auditor users from write actions", () => {
    expect(canManageAdultosMayores({ role: "auditor" })).toBe(false);
    expect(canManageAdultosMayores({ role: "admin" })).toBe(true);
    expect(canManageAdultosMayores({ role: "director" })).toBe(true);
  });
});
