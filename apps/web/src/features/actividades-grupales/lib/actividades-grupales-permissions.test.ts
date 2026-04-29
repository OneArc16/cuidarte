import { describe, expect, it } from "vitest";

import { canManageActividadesGrupales } from "./actividades-grupales-permissions";

describe("actividades grupales permissions", () => {
  it("blocks auditor users from create and diligenciamiento actions", () => {
    expect(canManageActividadesGrupales({ role: "auditor" })).toBe(false);
    expect(canManageActividadesGrupales({ role: "admin" })).toBe(true);
    expect(canManageActividadesGrupales({ role: "medico" })).toBe(true);
  });
});
