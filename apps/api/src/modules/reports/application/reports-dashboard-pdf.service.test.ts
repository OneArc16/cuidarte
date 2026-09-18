import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { buildMonthlySeries } from "./reports-dashboard-pdf.service";

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
