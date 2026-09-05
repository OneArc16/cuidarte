import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLegacyLocation } from "./backfill-ubicaciones";

const catalog = {
  departments: [
    { id: "department-bogota", name: "BOGOTA D.C." },
    { id: "department-cundinamarca", name: "CUNDINAMARCA" },
  ],
  municipalities: [
    { id: "municipality-bogota", departmentId: "department-bogota", name: "BOGOTA D.C." },
    { id: "municipality-soacha", departmentId: "department-cundinamarca", name: "SOACHA" },
  ],
};

describe("backfill de ubicaciones", () => {
  it("resuelve nombres historicos ignorando tildes y la abreviatura D.C.", () => {
    assert.deepEqual(resolveLegacyLocation(catalog, "Bogotá D.C.", "Bogota"), {
      departmentId: "department-bogota",
      municipalityId: "municipality-bogota",
    });
  });

  it("no asocia un municipio a un departamento diferente", () => {
    assert.equal(resolveLegacyLocation(catalog, "Cundinamarca", "Bogota"), null);
  });

  it("deja sin resolver filas con ubicacion incompleta", () => {
    assert.equal(resolveLegacyLocation(catalog, null, "Soacha"), null);
  });
});
