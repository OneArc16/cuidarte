import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canListTrashActividadesGrupales,
  canManageActividadesGrupales,
  canRestoreActividadGrupal,
  canTrashActividadGrupal,
} from "./actividad-grupal.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const adminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const auditorUser: AuthUser = {
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  tenantId,
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
  passwordSetByAdmin: true,
};

describe("actividad-grupal.policy", () => {
  it("blocks auditors from managing activities", () => {
    assert.equal(canManageActividadesGrupales(auditorUser), false);
    assert.equal(canManageActividadesGrupales(adminUser), true);
  });

  it("allows the creator or tenant admins to send an acta to trash", () => {
    const activity = {
      createdByUserId: adminUser.id,
      tenantId,
    };

    assert.equal(canTrashActividadGrupal(activity, adminUser), true);
    assert.equal(
      canTrashActividadGrupal(activity, {
        ...adminUser,
        id: "33333333-3333-4333-8333-333333333333",
        role: "director",
      }),
      true,
    );
    assert.equal(canTrashActividadGrupal(activity, auditorUser), false);
  });

  it("allows tenant users to list the trash and restore their own actas", () => {
    const activity = {
      createdByUserId: adminUser.id,
      tenantId,
    };

    assert.equal(canListTrashActividadesGrupales(adminUser), true);
    assert.equal(canListTrashActividadesGrupales(auditorUser), false);
    assert.equal(canRestoreActividadGrupal(activity, adminUser), true);
    assert.equal(
      canRestoreActividadGrupal(activity, {
        ...adminUser,
        id: "44444444-4444-4444-8444-444444444444",
        role: "director",
      }),
      true,
    );
    assert.equal(
      canRestoreActividadGrupal(activity, {
        ...adminUser,
        id: "55555555-5555-4555-8555-555555555555",
        role: "medico",
      }),
      false,
    );
  });
});
