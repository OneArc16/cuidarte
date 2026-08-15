import { describe, expect, it } from "vitest";

import {
  canManageActividadesGrupales,
  canViewActividadesGrupalesTrash,
} from "./actividades-grupales-permissions";

describe("actividades grupales permissions", () => {
  it("blocks auditor users from create and diligenciamiento actions", () => {
    expect(canManageActividadesGrupales({ role: "auditor" })).toBe(false);
    expect(canManageActividadesGrupales({ role: "admin" })).toBe(true);
    expect(canManageActividadesGrupales({ role: "medico" })).toBe(true);
  });

  it("allows tenant users and super admins to view the trash", () => {
    expect(
      canViewActividadesGrupalesTrash({
        role: "super_admin",
        tenantId: null,
      }),
    ).toBe(true);
    expect(
      canViewActividadesGrupalesTrash({
        role: "admin",
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      }),
    ).toBe(true);
    expect(
      canViewActividadesGrupalesTrash({
        role: "medico",
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      }),
    ).toBe(true);
    expect(
      canViewActividadesGrupalesTrash({
        role: "medico",
        tenantId: null,
      }),
    ).toBe(false);
    expect(
      canViewActividadesGrupalesTrash({
        role: "auditor",
        tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      }),
    ).toBe(false);
  });
});
