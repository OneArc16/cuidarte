import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canCreateAtencionEnfermeria,
  canEditAtencionEnfermeria,
  canOpenAtencionEnfermeriaModule,
  canReadAtencionEnfermeriaModule,
  canViewAtencionEnfermeria,
  resolveAtencionEnfermeriaAccess,
} from "./atencion-enfermeria.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const nurseUser: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId,
  email: "enfermera@centro.test",
  fullName: "Enfermera Centro",
  role: "enfermeria",
  passwordSetByAdmin: true,
};

const adminUser: AuthUser = {
  id: "22222222-2222-4222-8222-222222222222",
  tenantId,
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: true,
};

const medicUser: AuthUser = {
  id: "33333333-3333-4333-8333-333333333333",
  tenantId,
  email: "medico@centro.test",
  fullName: "Medico Centro",
  role: "medico",
  passwordSetByAdmin: true,
};

describe("atencion-enfermeria.policy", () => {
  it("opens the module only for the allowed dashboard roles", () => {
    assert.equal(canOpenAtencionEnfermeriaModule(nurseUser), true);
    assert.equal(canOpenAtencionEnfermeriaModule(adminUser), true);
    assert.equal(canOpenAtencionEnfermeriaModule(medicUser), false);
    assert.equal(canOpenAtencionEnfermeriaModule({ role: "super_admin" }), true);
  });

  it("allows read-only access for cross-clinical roles", () => {
    assert.equal(canReadAtencionEnfermeriaModule(nurseUser), true);
    assert.equal(canReadAtencionEnfermeriaModule(adminUser), true);
    assert.equal(canReadAtencionEnfermeriaModule(medicUser), true);
  });

  it("allows creation only for the nursing role", () => {
    assert.equal(canCreateAtencionEnfermeria(nurseUser), true);
    assert.equal(canCreateAtencionEnfermeria(adminUser), false);
    assert.equal(canCreateAtencionEnfermeria(medicUser), false);
  });

  it("resolves own, tenant and cross-clinical access without mixing tenants", () => {
    const record = {
      tenantId,
      createdByUserId: nurseUser.id,
    };

    assert.equal(resolveAtencionEnfermeriaAccess(nurseUser, record), "edit");
    assert.equal(canEditAtencionEnfermeria(nurseUser, record), true);
    assert.equal(
      resolveAtencionEnfermeriaAccess(
        {
          ...nurseUser,
          id: "44444444-4444-4444-8444-444444444444",
        },
        record,
      ),
      "view",
    );
    assert.equal(canViewAtencionEnfermeria(adminUser, record), true);
    assert.equal(canViewAtencionEnfermeria(medicUser, record), true);
    assert.equal(
      resolveAtencionEnfermeriaAccess(
        {
          ...adminUser,
          tenantId: "88888888-8888-4888-8888-888888888888",
        },
        record,
      ),
      null,
    );
    assert.equal(
      resolveAtencionEnfermeriaAccess(
        {
          ...adminUser,
          role: "super_admin",
          tenantId: null,
        },
        record,
      ),
      "view",
    );
  });
});
