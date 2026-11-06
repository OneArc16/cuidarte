import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AdultoMayorDetail, type AuthUser } from "@cuidarte/contracts";
import ExcelJS from "exceljs";

import { AdultosMayoresExportService, buildBasicPdf } from "./adultos-mayores-export.service";

const actor: AuthUser = {
  id: "68c499c2-8805-423d-8c7a-fc2649fab102",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: false,
};

describe("AdultosMayoresExportService", () => {
  it("conserva el listado e incluye toda la información diligenciada del adulto mayor", async () => {
    const service = new AdultosMayoresExportService({
      async listAdultosMayoresForExport() {
        return [
          { ...buildDetail({ status: "deceased", deathDate: "2026-06-10" }), programPeriods: [] },
          {
            ...buildDetail({ id: "1e3c7c94-33f4-4cf2-91ea-bb9f18db4cd2" }),
            programPeriods: [],
          },
        ];
      },
    } as never);

    const file = await service.exportExcel({ search: null, page: 1, pageSize: 20 }, actor);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Uint8Array.from(file.buffer).buffer);

    const worksheet = workbook.getWorksheet("Adultos mayores");

    assert.ok(worksheet);
    assert.equal(worksheet.getCell("I1").value, "Fecha de defunción");
    assert.equal(worksheet.getCell("I2").value, "10/06/2026");
    assert.equal(worksheet.getCell("I3").value, "");
    assert.equal(worksheet.getCell("J1").value, "Datos personales · Primer nombre");
    assert.equal(worksheet.getCell("N2").value, "12/03/1948");
    assert.equal(worksheet.getCell("R2").value, "Calle 1 # 2-3");
    assert.equal(worksheet.getCell("Y2").value, "Carlos Martinez");
    assert.equal(worksheet.getCell("AC2").value, "O+");
    assert.equal(worksheet.getCell("AE2").value, "Subsidiado");
    assert.equal(worksheet.getCell("AF2").value, "EPS Demo");
    assert.equal(worksheet.getCell("AG2").value, "Sí");
    assert.equal(worksheet.getCell("AI2").value, 850000);
    assert.equal(worksheet.getCell("AJ2").value, "No");
  });

  it("agrega al final el estado y los periodos del programa sin mover las columnas existentes", async () => {
    const service = new AdultosMayoresExportService({
      async listAdultosMayoresForExport() {
        return [
          {
            ...buildDetail(),
            programStatus: "active",
            programPeriods: [
              period("2026-07-15", "2026-09-01", null, "Hospitalizacion"),
              period("2026-10-01", null, "Regreso al centro"),
            ],
          },
          {
            ...buildDetail({ id: "1e3c7c94-33f4-4cf2-91ea-bb9f18db4cd2" }),
            programStatus: "inactive",
            programPeriods: [period("2026-07-15", "2026-09-01", null, "Se mudo con un familiar")],
          },
        ];
      },
    } as never);

    const file = await service.exportExcel({ search: null, page: 1, pageSize: 20 }, actor);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Uint8Array.from(file.buffer).buffer);
    const worksheet = workbook.getWorksheet("Adultos mayores");

    assert.ok(worksheet);
    assert.equal(worksheet.getCell("I1").value, "Fecha de defunción");
    assert.equal(worksheet.getCell("AJ1").value, "Salud · Beneficiario programa social");
    const programCells = (row: number) =>
      ["AK", "AL", "AM", "AN", "AO"].map((column) => worksheet.getCell(`${column}${row}`).value);

    assert.deepEqual(programCells(1), [
      "Programa · Estado",
      "Programa · Fecha de activación",
      "Programa · Fecha de inactivación",
      "Programa · Historial de periodos",
      "Programa · Motivo",
    ]);
    assert.deepEqual(programCells(2), [
      "Activo",
      "01/10/2026",
      "",
      "15/07/2026 - 01/09/2026 (salida: Hospitalizacion); 01/10/2026 - actual (ingreso: Regreso al centro)",
      "Regreso al centro",
    ]);
    assert.deepEqual(programCells(3), [
      "Inactivo",
      "15/07/2026",
      "01/09/2026",
      "15/07/2026 - 01/09/2026 (salida: Se mudo con un familiar)",
      "Se mudo con un familiar",
    ]);
  });

  it("incluye el estado y el periodo actual del programa en el PDF", () => {
    const service = new AdultosMayoresExportService({} as never);
    const items = [
      {
        ...buildDetail(),
        programStatus: "active" as const,
        programPeriods: [
          period("2026-07-15", "2026-09-01", null, "Hospitalizacion"),
          period("2026-10-01", null, "Regreso al centro"),
        ],
      },
      {
        ...buildDetail({ id: "1e3c7c94-33f4-4cf2-91ea-bb9f18db4cd2" }),
        programStatus: "inactive" as const,
        programPeriods: [period("2026-07-15", "2026-09-01", null, "Se mudo con un familiar")],
      },
    ];

    const html = (
      service as unknown as { buildPdfHtml(items: unknown[], includeTenant: boolean): string }
    ).buildPdfHtml(items, false);

    assert.match(html, /<th>Programa<\/th>\s*<th>Periodo actual<\/th>\s*<th>Motivo<\/th>/);
    assert.match(
      html,
      /<td>Activo<\/td>\s*<td>01\/10\/2026 - actual<\/td>\s*<td>Regreso al centro<\/td>/,
    );
    assert.match(
      html,
      /<td>Inactivo<\/td>\s*<td>15\/07\/2026 - 01\/09\/2026<\/td>\s*<td>Se mudo con un familiar<\/td>/,
    );

    const basicPdf = buildBasicPdf(items, false).toString("latin1");

    assert.ok(basicPdf.includes("Periodo actual"));
    assert.ok(basicPdf.includes("01/10/2026 - actual"));
    assert.ok(basicPdf.includes("15/07/2026 - 01/09/2026"));
    assert.ok(basicPdf.includes("Motivo"));
    assert.ok(basicPdf.includes("Regreso al cent"));
  });
});

function period(
  activationDate: string,
  inactivationDate: string | null,
  activationReason: string | null = null,
  inactivationReason: string | null = null,
) {
  return { activationDate, inactivationDate, activationReason, inactivationReason };
}

function buildDetail(overrides: Partial<AdultoMayorDetail> = {}): AdultoMayorDetail {
  return {
    id: "0b17e370-8f81-48c0-b707-c7046f497855",
    tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    tenantName: "Centro Demo",
    documentType: "cc",
    documentNumber: "1020304050",
    names: "Rosa Elena",
    surnames: "Martinez Rojas",
    phone: "3105550101",
    birthDate: "1948-03-12",
    age: 78,
    sex: "female",
    status: "alive",
    deathDate: null,
    programStatus: "active",
    firstName: "Rosa",
    middleName: "Elena",
    firstSurname: "Martinez",
    secondSurname: "Rojas",
    educationLevel: "Básica Primaria",
    disability: "Sin discapacidad",
    populationGroup: "Ninguna de las anteriores",
    address: "Calle 1 # 2-3",
    departmentId: "3fd190b3-9c53-4d40-a1fd-dddd30f2b2ec",
    municipalityId: "26daf6c7-fc90-4930-9ee0-6e797165fa27",
    department: "Magdalena",
    municipality: "Santa Marta",
    zone: "urban",
    country: "Colombia",
    phoneSecondary: "3105550102",
    email: "rosa@example.com",
    emergencyContactFullName: "Carlos Martinez",
    emergencyContactRelationship: "Hijo",
    emergencyContactPhone: "3105550103",
    emergencyContactAddress: "Carrera 4 # 5-6",
    bloodType: "o_positive",
    sisben: "B2",
    healthRegime: "subsidized",
    epsId: "24d8675f-d7fd-466c-950e-6d4bf4793d33",
    epsName: "EPS Demo",
    eps: "EPS Demo",
    livesWithSomeone: true,
    companion: "Carlos Martinez",
    economicIncome: 850000,
    socialProgramBeneficiary: false,
    documentFile: null,
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
    ...overrides,
  };
}
