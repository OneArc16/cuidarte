import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  CIE10_REFERENCE_DATA,
  loadCie10ReferenceData,
  parseCie10Csv,
} from "./cie10-reference-data";

describe("CIE-10 reference data", () => {
  it("loads the versioned catalog with its expected checksum and row count", async () => {
    const records = await loadCie10ReferenceData();

    assert.equal(records.length, CIE10_REFERENCE_DATA.rowCount);
    assert.deepEqual(records[0], {
      code: "A00.0",
      title: "COLERA DEBIDO A VIBRIO CHOLERAE 01, BIOTIPO CHOLERAE",
      titleNormalized: "colera debido a vibrio cholerae 01, biotipo cholerae",
    });
  });

  it("normalizes compact codes and quoted commas", () => {
    const records = parseCie10Csv('code,title\nI10X,"Titulo, con coma"\n');

    assert.deepEqual(records, [
      {
        code: "I10.X",
        title: "Titulo, con coma",
        titleNormalized: "titulo, con coma",
      },
    ]);
  });

  it("rejects duplicate codes instead of silently dropping records", () => {
    assert.throws(
      () => parseCie10Csv("code,title\nA000,Primero\nA00.0,Duplicado\n"),
      /Codigo CIE-10 duplicado/,
    );
  });
});
