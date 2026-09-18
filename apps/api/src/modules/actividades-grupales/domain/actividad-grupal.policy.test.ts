import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canEditActividadGrupal,
  canListTrashActividadesGrupales,
  canManageActividadesGrupales,
  canTrashActividadGrupal,
  canViewActividadGrupal,
  resolvePermittedActividadGrupalOrganizers,
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

  it("limits professional teams to their own organizers and their paired team", () => {
    assert.deepEqual(resolvePermittedActividadGrupalOrganizers({ role: "fisioterapeuta" }), [
      "fisioterapeuta",
    ]);
    assert.deepEqual(resolvePermittedActividadGrupalOrganizers({ role: "nutricionista" }), [
      "nutricionista",
    ]);
    assert.deepEqual(resolvePermittedActividadGrupalOrganizers({ role: "recreacionista" }), [
      "recreacionista",
    ]);
    assert.deepEqual(resolvePermittedActividadGrupalOrganizers({ role: "medico" }), [
      "medico",
      "enfermeria",
    ]);
    assert.deepEqual(resolvePermittedActividadGrupalOrganizers({ role: "trabajadora_social" }), [
      "psicologa",
      "trabajadora_social",
    ]);
    assert.equal(canViewActividadGrupal({ organizer: "enfermeria" }, { role: "medico" }), true);
    assert.equal(canViewActividadGrupal({ organizer: "nutricionista" }, { role: "medico" }), false);
    assert.equal(canViewActividadGrupal({ organizer: "nutricionista" }, adminUser), true);
  });

  it("allows only admins and super admins to delete an acta", () => {
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
      false,
    );
    assert.equal(canTrashActividadGrupal(activity, auditorUser), false);
  });

  it("keeps edit permissions broader than delete permissions", () => {
    const activity = {
      createdByUserId: adminUser.id,
      tenantId,
    };

    assert.equal(canEditActividadGrupal(activity, adminUser), true);
    assert.equal(
      canEditActividadGrupal(activity, {
        ...adminUser,
        id: "33333333-3333-4333-8333-333333333333",
        role: "director",
      }),
      true,
    );
    assert.equal(
      canEditActividadGrupal(
        { ...activity, createdByUserId: "33333333-3333-4333-8333-333333333333" },
        {
          ...adminUser,
          id: "33333333-3333-4333-8333-333333333333",
          role: "medico",
        },
      ),
      true,
    );
  });

  it("allows only admins and super admins to list the deletion log", () => {
    assert.equal(canListTrashActividadesGrupales(adminUser), true);
    assert.equal(canListTrashActividadesGrupales(auditorUser), false);
    assert.equal(
      canListTrashActividadesGrupales({
        tenantId: adminUser.tenantId,
        role: "director",
      }),
      false,
    );
  });
});
