import { describe, expect, it } from "vitest";
import { type UserPermission } from "@cuidarte/contracts";

import { canExportReports, canViewReportChart } from "./reports-permissions";

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

  it("uses the chart permission selected for an auditor, including later changes", () => {
    const user = {
      role: "auditor" as const,
      permissions: ["reportes.view", "reportes.chart.activities_by_type"] as UserPermission[],
    };

    expect(canViewReportChart(user, "reportes.chart.activities_by_type")).toBe(true);
    expect(canViewReportChart(user, "reportes.chart.monthly_attendances")).toBe(false);

    user.permissions.push("reportes.chart.monthly_attendances");
    expect(canViewReportChart(user, "reportes.chart.monthly_attendances")).toBe(true);

    user.permissions = user.permissions.filter(
      (permission) => permission !== "reportes.chart.monthly_attendances",
    );
    expect(canViewReportChart(user, "reportes.chart.monthly_attendances")).toBe(false);
  });
});
