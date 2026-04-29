import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canAccessAlimentacion,
  canManageAlimentacion,
  resolveAlimentacionScope,
} from "./alimentacion.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const directorUser: AuthUser = {
  id: "7b820700-fd7d-4b2e-9d61-2e4bca413c8a",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
};

const adminUser: AuthUser = {
  ...directorUser,
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
};

const superAdminUser: AuthUser = {
  ...directorUser,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
};

const medicoUser: AuthUser = {
  ...directorUser,
  id: "eaebfa34-4ef2-4b10-b8a5-1db6d494a2a2",
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
};

describe("alimentacion policy", () => {
  it("allows only super admin, admin, and director to access and manage the module", () => {
    assert.equal(canAccessAlimentacion(superAdminUser), true);
    assert.equal(canAccessAlimentacion(adminUser), true);
    assert.equal(canAccessAlimentacion(directorUser), true);
    assert.equal(canAccessAlimentacion(medicoUser), false);

    assert.equal(canManageAlimentacion(superAdminUser), true);
    assert.equal(canManageAlimentacion(adminUser), true);
    assert.equal(canManageAlimentacion(directorUser), true);
    assert.equal(canManageAlimentacion(medicoUser), false);
  });

  it("scopes supported roles by tenant and keeps super admin global", () => {
    assert.deepEqual(resolveAlimentacionScope(superAdminUser), { type: "all" });
    assert.deepEqual(resolveAlimentacionScope(adminUser), { type: "tenant", tenantId });
    assert.deepEqual(resolveAlimentacionScope(directorUser), { type: "tenant", tenantId });
    assert.equal(
      resolveAlimentacionScope({
        ...directorUser,
        tenantId: null,
      }),
      null,
    );
    assert.equal(resolveAlimentacionScope(medicoUser), null);
  });
});
