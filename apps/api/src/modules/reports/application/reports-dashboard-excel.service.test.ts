import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type ReportsDashboardResponse } from "@cuidarte/contracts";
import ExcelJS from "exceljs";

import { ReportsDashboardExcelService } from "./reports-dashboard-excel.service";

const actor: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: false,
};

describe("ReportsDashboardExcelService", () => {
  it("creates the four workbook sheets from dashboard data", async () => {
    const service = new ReportsDashboardExcelService({
      getDashboard: async () => dashboard,
    } as never);

    const file = await service.exportExcel({ from: "2026-09-01", to: "2026-09-02" }, actor);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    assert.equal(
      file.contentType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.deepEqual(
      workbook.worksheets.map((sheet) => sheet.name),
      ["Resumen", "Por dia", "Actividades por tipo", "Metodologia"],
    );
    assert.equal(workbook.getWorksheet("Resumen")?.getCell("B9").value, 4);
    assert.equal(workbook.getWorksheet("Por dia")?.rowCount, 3);
  });
});

const dashboard: ReportsDashboardResponse = {
  range: { from: "2026-09-01", to: "2026-09-02" },
  scope: {
    tenantId: actor.tenantId,
    tenantName: "Centro Demo",
    isConsolidated: false,
  },
  summary: {
    nursingAttendances: 2,
    medicalAttendances: 1,
    activities: 3,
    transportAllowancesDelivered: 4,
    snackOneDelivered: 5,
    snackTwoDelivered: 6,
    snacksDelivered: 11,
    lunchesDelivered: 7,
  },
  dailySeries: [
    {
      date: "2026-09-01",
      nursingAttendances: 2,
      medicalAttendances: 1,
      activities: 3,
      transportAllowancesDelivered: 4,
      snacksDelivered: 11,
      lunchesDelivered: 7,
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
  activitiesByType: [],
};
