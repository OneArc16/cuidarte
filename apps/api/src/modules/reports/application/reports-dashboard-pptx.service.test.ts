import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ReportsDashboardResponse } from "@cuidarte/contracts";

import { ReportsDashboardPptxService } from "./reports-dashboard-pptx.service";

describe("ReportsDashboardPptxService", () => {
  it("generates an OOXML presentation with editable chart slides", async () => {
    const service = new ReportsDashboardPptxService({
      getDashboard: async () => dashboard,
    } as never);

    const file = await service.exportPptx({ from: "2026-09-01", to: "2026-09-02" }, {} as never);

    assert.equal(
      file.contentType,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    assert.equal(file.buffer.subarray(0, 2).toString(), "PK");
    assert.match(file.filename, /2026-09-01-2026-09-02\.pptx$/);
  });
});

const dashboard: ReportsDashboardResponse = {
  range: { from: "2026-09-01", to: "2026-09-02" },
  scope: { tenantId: null, tenantName: null, isConsolidated: true },
  summary: {
    nursingAttendances: 1,
    medicalAttendances: 2,
    activities: 1,
    transportAllowancesDelivered: 3,
    snackOneDelivered: 2,
    snackTwoDelivered: 1,
    snacksDelivered: 3,
    lunchesDelivered: 4,
  },
  dailySeries: [
    {
      date: "2026-09-01",
      nursingAttendances: 1,
      medicalAttendances: 2,
      activities: 1,
      transportAllowancesDelivered: 3,
      snacksDelivered: 3,
      lunchesDelivered: 4,
    },
    {
      date: "2026-09-02",
      nursingAttendances: 0,
      medicalAttendances: 0,
      activities: 0,
      transportAllowancesDelivered: 0,
      snacksDelivered: 0,
      lunchesDelivered: 0,
    },
  ],
  activitiesByType: [
    {
      activityTypeId: "44444444-4444-4444-8444-444444444444",
      activityTypeName: "Taller",
      count: 1,
    },
  ],
};
