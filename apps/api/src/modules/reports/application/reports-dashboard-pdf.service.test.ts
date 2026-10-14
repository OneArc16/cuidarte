import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ReportsDashboardResponse } from "@cuidarte/contracts";

import { buildMonthlySeries, buildPdfHtml } from "./reports-dashboard-pdf.service";

describe("buildMonthlySeries", () => {
  it("groups daily dashboard points by month and sums chart metrics", () => {
    const monthlySeries = buildMonthlySeries([
      {
        date: "2026-09-30",
        nursingAttendances: 2,
        medicalAttendances: 1,
        activities: 4,
        transportAllowancesDelivered: 3,
        snacksDelivered: 5,
        lunchesDelivered: 6,
      },
      {
        date: "2026-09-30",
        nursingAttendances: 1,
        medicalAttendances: 2,
        activities: 2,
        transportAllowancesDelivered: 4,
        snacksDelivered: 6,
        lunchesDelivered: 7,
      },
      {
        date: "2026-10-01",
        nursingAttendances: 5,
        medicalAttendances: 3,
        activities: 1,
        transportAllowancesDelivered: 8,
        snacksDelivered: 9,
        lunchesDelivered: 10,
      },
    ]);

    assert.deepEqual(monthlySeries, [
      {
        month: "2026-09",
        nursingAttendances: 3,
        medicalAttendances: 3,
        transportAllowancesDelivered: 7,
        snacksDelivered: 11,
        lunchesDelivered: 13,
      },
      {
        month: "2026-10",
        nursingAttendances: 5,
        medicalAttendances: 3,
        transportAllowancesDelivered: 8,
        snacksDelivered: 9,
        lunchesDelivered: 10,
      },
    ]);
  });
});

describe("buildPdfHtml", () => {
  it("reserves content space without changing the fixed letterhead", () => {
    const html = buildPdfHtml(createDashboard(), "data:image/png;base64,bWVtYnJldGU=");

    assert.match(html, /@page \{ size: Letter portrait; margin: 14mm 12mm; \}/);
    assert.match(html, /\.pdf-letterhead \{ position: fixed; top: -14mm; left: -12mm;/);
    assert.match(html, /\.report-content \{ position: relative; z-index: 1; padding: 22mm 0 22mm;/);
  });
});

function createDashboard(): ReportsDashboardResponse {
  return {
    range: { from: "2026-01-01", to: "2026-01-31" },
    scope: { tenantId: null, tenantName: null, isConsolidated: true },
    summary: {
      nursingAttendances: 0,
      medicalAttendances: 0,
      activities: 0,
      transportAllowancesDelivered: 0,
      snackOneDelivered: 0,
      snackTwoDelivered: 0,
      snacksDelivered: 0,
      lunchesDelivered: 0,
    },
    dailySeries: [],
    activitiesByType: [],
    sexDistribution: { male: 0, female: 0, other: 0 },
  };
}
