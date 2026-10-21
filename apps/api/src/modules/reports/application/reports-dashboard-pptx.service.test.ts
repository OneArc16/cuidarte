import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type ReportsDashboardResponse } from "@cuidarte/contracts";
import JSZip from "jszip";

import { buildMonthlySeries, ReportsDashboardPptxService } from "./reports-dashboard-pptx.service";

describe("ReportsDashboardPptxService", () => {
  it("generates an OOXML presentation with all dashboard charts", async () => {
    const service = new ReportsDashboardPptxService({
      getDashboard: async () => dashboard,
    } as never);

    const file = await service.exportPptx({ from: "2026-09-01", to: "2026-09-02" }, actor);

    assert.equal(
      file.contentType,
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    );
    assert.equal(file.buffer.subarray(0, 2).toString(), "PK");
    assert.match(file.filename, /2026-09-01-2026-09-02\.pptx$/);

    const zip = await JSZip.loadAsync(Uint8Array.from(file.buffer));
    const slideNames = Object.keys(zip.files).filter((name) =>
      /^ppt\/slides\/slide\d+\.xml$/.test(name),
    );
    const chartNames = Object.keys(zip.files).filter((name) =>
      /^ppt\/charts\/chart\d+\.xml$/.test(name),
    );
    const coverXml = await zip.file("ppt/slides/slide1.xml")?.async("string");
    const slideXml = await Promise.all(
      slideNames.map(async (name) => (await zip.file(name)?.async("string")) ?? ""),
    );

    assert.equal(slideNames.length, 8);
    assert.equal(chartNames.length, 6);
    assert.ok(coverXml?.includes("Sede:"));
    assert.ok(!coverXml?.includes("Metodolog"));
    assert.match(slideXml.join("\n"), /Personas por sexo/);
    assert.match(slideXml.join("\n"), /Almuerzos y refrigerios entregados por mes/);
    assert.match(slideXml.join("\n"), /Auxilios de transporte por mes/);

    assert.deepEqual(buildMonthlySeries(dashboard.dailySeries), [
      {
        month: "2026-09",
        nursingAttendances: 1,
        medicalAttendances: 2,
        transportAllowancesDelivered: 3,
        snacksDelivered: 3,
        lunchesDelivered: 4,
      },
    ]);
  });
});

const actor: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
  passwordSetByAdmin: false,
};

const dashboard: ReportsDashboardResponse = {
  range: { from: "2026-09-01", to: "2026-09-02" },
  scope: {
    tenantId: null,
    tenantName: null,
    isConsolidated: true,
    municipality: "Santa Marta",
    department: "Magdalena",
  },
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
  sexDistribution: { male: 3, female: 5, other: 1 },
};
