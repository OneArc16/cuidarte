import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canImportAdultosMayores,
  resolveAdultoMayorImportTenantForConfirm,
  resolveAdultoMayorImportTenantForValidate,
} from "./adulto-mayor-import.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";

const directorUser: AuthUser = {
  id: "33333333-3333-4333-8333-333333333333",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
};

const superAdminUser: AuthUser = {
  ...directorUser,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "SuperAdmin Cuidarte",
  role: "super_admin",
};

describe("adulto-mayor-import.policy", () => {
  it("allows directors to import adults", () => {
    assert.equal(canImportAdultosMayores(directorUser), true);
  });

  it("scopes director validation imports to their own tenant", () => {
    assert.equal(resolveAdultoMayorImportTenantForValidate(directorUser, otherTenantId), tenantId);
  });

  it("scopes director confirm imports to their own tenant", () => {
    assert.equal(resolveAdultoMayorImportTenantForConfirm(directorUser, otherTenantId), tenantId);
  });

  it("keeps super admin tenant selection flexible", () => {
    assert.equal(
      resolveAdultoMayorImportTenantForValidate(superAdminUser, otherTenantId),
      otherTenantId,
    );
    assert.equal(
      resolveAdultoMayorImportTenantForConfirm(superAdminUser, otherTenantId),
      otherTenantId,
    );
  });
});
