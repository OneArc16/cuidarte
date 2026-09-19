import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type ReportsDashboardResponse } from "@cuidarte/contracts";
import ExcelJS from "exceljs";
import JSZip from "jszip";

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
  it("creates summary, monthly and activity sheets with monthly charts", async () => {
    const service = new ReportsDashboardExcelService({
      getDashboard: async () => dashboard,
    } as never);

    const file = await service.exportExcel({ from: "2026-09-01", to: "2026-09-02" }, actor);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Uint8Array.from(file.buffer).buffer);
    const zip = await JSZip.loadAsync(Uint8Array.from(file.buffer));
    const chartFiles = Object.keys(zip.files).filter((name) =>
      /^xl\/charts\/chart\d+\.xml$/.test(name),
    );
    const drawingFiles = Object.keys(zip.files).filter((name) =>
      /^xl\/drawings\/drawing\d+\.xml$/.test(name),
    );

    assert.equal(
      file.contentType,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    assert.deepEqual(
      workbook.worksheets.map((sheet) => sheet.name),
      ["Resumen", "Septiembre 2026", "Actividades por tipo"],
    );
    assert.equal(workbook.getWorksheet("Resumen")?.getCell("B9").value, 4);
    assert.equal(workbook.getWorksheet("Septiembre 2026")?.getCell("B9").value, 11);
    assert.equal(workbook.getWorksheet("Por dia"), undefined);
    assert.equal(workbook.getWorksheet("Metodologia"), undefined);
    assert.equal(chartFiles.length, 5);
    assert.equal(drawingFiles.length, 3);
    assert.equal(
      Object.keys(zip.files).some((name) => name.startsWith("xl/media/")),
      false,
    );
    for (const sheetId of [1, 2, 3]) {
      const sheetXml = await zip.file(`xl/worksheets/sheet${sheetId}.xml`)?.async("string");
      assert.match(sheetXml ?? "", /<drawing r:id="rId\d+"\/>/);
    }
    const summaryDrawing = await zip.file("xl/drawings/drawing1.xml")?.async("string");
    assert.equal((summaryDrawing?.match(/<c:chart /g) ?? []).length, 2);
    const pieChart = await zip.file("xl/charts/chart2.xml")?.async("string");
    assert.match(pieChart ?? "", /<c:pieChart>/);
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
