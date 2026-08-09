import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveLegacyEps } from "./backfill-eps";

const catalog = [
  {
    id: "33333333-3333-4333-8333-333333333333",
    name: "Salud Sána S.A.",
    nameNormalized: "salud sana s a",
  },
];

describe("EPS backfill", () => {
  it("resuelve una coincidencia normalizada exacta", () => {
    assert.deepEqual(resolveLegacyEps(catalog, "SALUD-SANA S.A."), {
      epsId: catalog[0]?.id,
      epsName: catalog[0]?.name,
    });
  });

  it("no asigna coincidencias parciales", () => {
    assert.equal(resolveLegacyEps(catalog, "Salud Sana"), null);
  });

  it("ignora valores vacios", () => {
    assert.equal(resolveLegacyEps(catalog, "  "), null);
    assert.equal(resolveLegacyEps(catalog, null), null);
  });
});
