import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AdultoMayorListItem, type AuthUser } from "@cuidarte/contracts";
import ExcelJS from "exceljs";

import { AdultosMayoresExportService } from "./adultos-mayores-export.service";

const actor: AuthUser = {
  id: "68c499c2-8805-423d-8c7a-fc2649fab102",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: false,
};

describe("AdultosMayoresExportService", () => {
  it("incluye la fecha de defuncion y deja vacia la de personas vivas", async () => {
    const service = new AdultosMayoresExportService({
      async listAdultosMayores() {
        return [
          buildListItem({ status: "deceased", deathDate: "2026-06-10" }),
          buildListItem({ id: "1e3c7c94-33f4-4cf2-91ea-bb9f18db4cd2" }),
        ];
      },
    } as never);

    const file = await service.exportExcel({ search: null }, actor);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(Uint8Array.from(file.buffer).buffer);

    const worksheet = workbook.getWorksheet("Adultos mayores");

    assert.ok(worksheet);
    assert.equal(worksheet.getCell("I1").value, "Fecha de defunción");
    assert.equal(worksheet.getCell("I2").value, "10/06/2026");
    assert.equal(worksheet.getCell("I3").value, "");
  });
});

function buildListItem(overrides: Partial<AdultoMayorListItem> = {}): AdultoMayorListItem {
  return {
    id: "0b17e370-8f81-48c0-b707-c7046f497855",
    tenantId: actor.tenantId,
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
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
    ...overrides,
  };
}
