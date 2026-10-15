import { describe, expect, it } from "vitest";

import { canExportReports } from "./reports-permissions";

describe("report export permissions", () => {
  it("allows exports by default only to super admin, admin, and director", () => {
    expect(canExportReports({ role: "super_admin" })).toBe(true);
    expect(canExportReports({ role: "admin" })).toBe(true);
    expect(canExportReports({ role: "director" })).toBe(true);
    expect(canExportReports({ role: "auditor" })).toBe(false);
    expect(canExportReports({ role: "nutricionista" })).toBe(false);
  });

  it("uses the explicit permission for users configured individually", () => {
    expect(
      canExportReports({
        role: "nutricionista",
        permissions: ["reportes.view", "reportes.export"],
      }),
    ).toBe(true);
    expect(canExportReports({ role: "director", permissions: ["reportes.view"] })).toBe(false);
  });
});
