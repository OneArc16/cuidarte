import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canImportAdultosMayores,
  isRequestedAdultoMayorImportTenantAllowed,
  resolveAdultoMayorImportTenantForValidate,
} from "./adulto-mayor-import.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "1488c239-6cb1-4125-988a-734cd39d13d3";

describe("adulto mayor import policy", () => {
  it("permite importar a superadmin, admin y director", () => {
    assert.equal(canImportAdultosMayores(createActor("super_admin", null)), true);
    assert.equal(canImportAdultosMayores(createActor("admin")), true);
    assert.equal(canImportAdultosMayores(createActor("director")), true);
    assert.equal(canImportAdultosMayores(createActor("auditor")), false);
  });

  it("mantiene a admin y director dentro del centro de su sesion", () => {
    for (const role of ["admin", "director"] as const) {
      const actor = createActor(role);

      assert.equal(resolveAdultoMayorImportTenantForValidate(actor, null), tenantId);
      assert.equal(resolveAdultoMayorImportTenantForValidate(actor, tenantId), tenantId);
      assert.equal(isRequestedAdultoMayorImportTenantAllowed(actor, null), true);
      assert.equal(isRequestedAdultoMayorImportTenantAllowed(actor, tenantId), true);
      assert.equal(isRequestedAdultoMayorImportTenantAllowed(actor, otherTenantId), false);
    }
  });

  it("permite que superadmin seleccione el centro de destino", () => {
    const actor = createActor("super_admin", null);

    assert.equal(resolveAdultoMayorImportTenantForValidate(actor, otherTenantId), otherTenantId);
    assert.equal(isRequestedAdultoMayorImportTenantAllowed(actor, otherTenantId), true);
  });
});

function createActor(role: AuthUser["role"], actorTenantId: string | null = tenantId): AuthUser {
  return {
    id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
    tenantId: actorTenantId,
    email: "usuario@cuidarte.test",
    fullName: "Usuario CuidarTe",
    role,
    passwordSetByAdmin: true,
  };
}
