import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  reportsDashboardQuerySchema,
  type AuthUser,
  type ReportsDashboardQuery,
} from "@cuidarte/contracts";
import { ForbiddenException } from "@nestjs/common";

import { type ReportsDashboardRepository } from "../domain/reports-dashboard.repository";
import { type ReportsDashboardAggregate } from "../domain/reports-dashboard.types";
import { ReportsDashboardService } from "./reports-dashboard.service";

const tenantId = "22222222-2222-4222-8222-222222222222";
const query: ReportsDashboardQuery = { from: "2026-09-01", to: "2026-09-03" };

const tenantAdmin: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId,
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: false,
};

const superAdmin: AuthUser = {
  ...tenantAdmin,
  id: "33333333-3333-4333-8333-333333333333",
  tenantId: null,
  role: "super_admin",
};

describe("ReportsDashboardService", () => {
  it("validates an inclusive range up to 366 days", () => {
    assert.doesNotThrow(() =>
      reportsDashboardQuerySchema.parse({ from: "2026-01-01", to: "2027-01-01" }),
    );
    assert.throws(() =>
      reportsDashboardQuerySchema.parse({ from: "2026-01-01", to: "2027-01-03" }),
    );
    assert.throws(() =>
      reportsDashboardQuerySchema.parse({ from: "2026-02-30", to: "2026-03-01" }),
    );
  });

  it("returns summary metrics and fills missing days with zeroes", async () => {
    const repository = new InMemoryReportsDashboardRepository({
      tenantName: "Centro Demo",
      dailySeries: [
        {
          date: "2026-09-01",
          nursingAttendances: 2,
          medicalAttendances: 1,
          activities: 3,
          transportAllowancesDelivered: 4,
          snacksDelivered: 5,
          lunchesDelivered: 6,
        },
      ],
      activitiesByType: [
        {
          activityTypeId: "44444444-4444-4444-8444-444444444444",
          activityTypeName: "Taller",
          count: 3,
        },
      ],
      snackOneDelivered: 2,
      snackTwoDelivered: 3,
    });

    const response = await new ReportsDashboardService(repository).getDashboard(query, tenantAdmin);

    assert.deepEqual(repository.lastScope, { tenantId });
    assert.equal(response.dailySeries.length, 3);
    assert.deepEqual(response.dailySeries[1], {
      date: "2026-09-02",
      nursingAttendances: 0,
      medicalAttendances: 0,
      activities: 0,
      transportAllowancesDelivered: 0,
      snacksDelivered: 0,
      lunchesDelivered: 0,
    });
    assert.deepEqual(response.summary, {
      nursingAttendances: 2,
      medicalAttendances: 1,
      activities: 3,
      transportAllowancesDelivered: 4,
      snackOneDelivered: 2,
      snackTwoDelivered: 3,
      snacksDelivered: 5,
      lunchesDelivered: 6,
    });
  });

  it("uses consolidated scope for super admins", async () => {
    const repository = new InMemoryReportsDashboardRepository(emptyAggregate);

    const response = await new ReportsDashboardService(repository).getDashboard(query, superAdmin);

    assert.deepEqual(repository.lastScope, { tenantId: null });
    assert.equal(response.scope.isConsolidated, true);
  });

  it("consolidates activity types with the same name for super admins", async () => {
    const repository = new InMemoryReportsDashboardRepository({
      ...emptyAggregate,
      activitiesByType: [
        {
          activityTypeId: "44444444-4444-4444-8444-444444444444",
          activityTypeName: "Actividad de Campo",
          count: 1,
        },
        {
          activityTypeId: "55555555-5555-4555-8555-555555555555",
          activityTypeName: " actividad de campo ",
          count: 2,
        },
        {
          activityTypeId: "66666666-6666-4666-8666-666666666666",
          activityTypeName: "Salud Preventiva",
          count: 3,
        },
      ],
    });

    const response = await new ReportsDashboardService(repository).getDashboard(query, superAdmin);

    assert.deepEqual(response.activitiesByType, [
      {
        activityTypeId: "44444444-4444-4444-8444-444444444444",
        activityTypeName: "Actividad de Campo",
        count: 3,
      },
      {
        activityTypeId: "66666666-6666-4666-8666-666666666666",
        activityTypeName: "Salud Preventiva",
        count: 3,
      },
    ]);
    assert.equal(response.summary.activities, 6);
  });

  it("rejects actors without report access", async () => {
    const repository = new InMemoryReportsDashboardRepository(emptyAggregate);
    const actor = { ...tenantAdmin, role: "medico" } as AuthUser;

    await assert.rejects(new ReportsDashboardService(repository).getDashboard(query, actor), {
      constructor: ForbiddenException,
    });
    assert.equal(repository.lastScope, undefined);
  });
});

class InMemoryReportsDashboardRepository implements ReportsDashboardRepository {
  lastScope: { tenantId: string | null } | undefined;

  constructor(private readonly aggregateResult: ReportsDashboardAggregate) {}

  async aggregate(input: ReportsDashboardQuery & { scope: { tenantId: string | null } }) {
    this.lastScope = input.scope;
    return this.aggregateResult;
  }
}

const emptyAggregate: ReportsDashboardAggregate = {
  tenantName: null,
  dailySeries: [],
  activitiesByType: [],
  snackOneDelivered: 0,
  snackTwoDelivered: 0,
};
