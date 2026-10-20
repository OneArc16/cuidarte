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
  it("renders a full-page letterhead behind the safe report content area", () => {
    const html = buildPdfHtml(createDashboard(), "data:image/png;base64,bWVtYnJldGU=");

    assert.match(html, /@page \{ size: 215\.9mm 279\.4mm; margin: 0; \}/);
    assert.match(html, /\.pdf-letterhead \{ position: fixed; top: 0; left: 0;/);
    assert.match(html, /opacity: 0\.45;/);
    assert.match(html, /object-fit: contain; object-position: center;/);
    assert.doesNotMatch(html, /transform: scale/);
    assert.match(
      html,
      /\.report-content \{ position: relative; z-index: 1; width: 215\.9mm; min-height: 279\.4mm; padding: 45mm 24mm 32mm;/,
    );
  });

  it("omits the monthly attendance chart when it is disabled for the auditor PDF", () => {
    const html = buildPdfHtml(createDashboard(), null, {
      includeMonthlyAttendanceChart: false,
    });

    assert.doesNotMatch(html, /Atenciones por mes/);
    assert.doesNotMatch(html, /Comparación mensual de enfermería y medicina/);
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
