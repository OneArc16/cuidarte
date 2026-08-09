import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { assertEpsCatalogIntegrity } from "./eps-catalog-integrity";
import { loadBundledEpsReferenceData, normalizeEpsName, parseEpsRows } from "./eps-reference-data";

describe("EPS reference data", () => {
  it("parsea codigo, NIT y nombre e ignora el ID externo", () => {
    const result = parseEpsRows([
      ["ID EPS", "Codigo", "NIT", "Nombre"],
      ["99", " eps001 ", "900.123.456-7", "  Nueva   Salud EPS  "],
    ]);

    assert.equal(result.sourceRowCount, 1);
    assert.deepEqual(result.records, [
      {
        code: "EPS001",
        nit: "9001234567",
        name: "Nueva Salud EPS",
        nameNormalized: "nueva salud eps",
      },
    ]);
  });

  it("rechaza duplicados antes de persistir", () => {
    assert.throws(
      () =>
        parseEpsRows([
          ["Codigo", "NIT", "Nombre"],
          ["EPS001", "9001234567", "Nueva Salud EPS"],
          ["EPS001", "8001234567", "Otra EPS"],
        ]),
      /duplicado de codigo/i,
    );
  });

  it("normaliza tildes y puntuacion para coincidencias exactas", () => {
    assert.equal(normalizeEpsName("  SALUD-SÁNA  S.A.  "), "salud sana s a");
  });

  it("acepta los encabezados y el NIT alfanumerico del archivo real", () => {
    const result = parseEpsRows([
      ["Código", "NIT\nCorrecto", "Razón Social"],
      ["EPS001", "N830113831", "COLMEDICA EPS - ALIANSALUD DESDE EL 01/01/2011"],
    ]);

    assert.deepEqual(result.records, [
      {
        code: "EPS001",
        nit: "N830113831",
        name: "COLMEDICA EPS - ALIANSALUD DESDE EL 01/01/2011",
        nameNormalized: "colmedica eps aliansalud desde el 01 01 2011",
      },
    ]);
  });

  it("protege la identidad del codigo en seeds e importaciones", () => {
    const existingRecord = {
      code: "EPS001",
      nit: "N830113831",
      name: "COLMEDICA EPS",
      nameNormalized: "colmedica eps",
    };

    assert.throws(
      () =>
        assertEpsCatalogIntegrity(
          [existingRecord],
          [
            {
              ...existingRecord,
              nit: "N900000000",
            },
          ],
        ),
      /ya existe con el NIT/i,
    );
  });

  it("permite que codigos distintos compartan NIT", () => {
    assert.doesNotThrow(() =>
      assertEpsCatalogIntegrity(
        [
          {
            code: "EPS037",
            nit: "N900156264",
            name: "NUEVA EPS",
            nameNormalized: "nueva eps",
          },
        ],
        [
          {
            code: "EPS041",
            nit: "N900156264",
            name: "NUEVA EPS MOVILIDAD",
            nameNormalized: "nueva eps movilidad",
          },
        ],
      ),
    );
  });

  it("permite limpiar espacios de un NIT sin cambiar su identidad", () => {
    assert.doesNotThrow(() =>
      assertEpsCatalogIntegrity(
        [
          {
            code: "EPS040",
            nit: " N900604350  ",
            name: "SAVIA SALUD",
            nameNormalized: "savia salud",
          },
        ],
        [
          {
            code: "EPS040",
            nit: "N900604350",
            name: "SAVIA SALUD",
            nameNormalized: "savia salud",
          },
        ],
      ),
    );
  });

  it("carga el catalogo versionado de produccion", async () => {
    const result = await loadBundledEpsReferenceData();

    assert.equal(result.sourceRowCount, 56);
    assert.equal(result.records.length, 56);
    assert.ok(result.checksumSha256.length === 64);
    assert.deepEqual(
      result.records.find((record) => record.code === "EPS001"),
      {
        code: "EPS001",
        nit: "N830113831",
        name: "COLMEDICA EPS",
        nameNormalized: "colmedica eps",
      },
    );
  });
});
