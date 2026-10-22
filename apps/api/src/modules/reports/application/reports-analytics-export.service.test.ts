import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type UserPermission } from "@cuidarte/contracts";

import { canViewReportDashboardChart } from "../domain/report.policy";
import { queuedExportActor } from "./reports-analytics-export.service";

describe("queuedExportActor", () => {
  it("preserves the chart permissions captured when the export was requested", () => {
    const requestedExport = {
      requestedByUserId: "11111111-1111-4111-8111-111111111111",
      tenantId: "22222222-2222-4222-8222-222222222222",
      requestedByRole: "auditor" as const,
      requestedByPermissions: ["reportes.view", "reportes.export"] as UserPermission[],
    };

    const withoutMonthlyAttendance = queuedExportActor(requestedExport);
    assert.equal(
      canViewReportDashboardChart(withoutMonthlyAttendance, "reportes.chart.monthly_attendances"),
      false,
    );

    const withMonthlyAttendance = queuedExportActor({
      ...requestedExport,
      requestedByPermissions: [
        ...requestedExport.requestedByPermissions,
        "reportes.chart.monthly_attendances",
      ],
    });
    assert.equal(
      canViewReportDashboardChart(withMonthlyAttendance, "reportes.chart.monthly_attendances"),
      true,
    );
    assert.deepEqual(withMonthlyAttendance.permissions, [
      "reportes.view",
      "reportes.export",
      "reportes.chart.monthly_attendances",
    ]);
  });
});
