import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException, ForbiddenException } from "@nestjs/common";

import {
  assertCanAccessReportJob,
  assertCanUseReports,
  resolveReportTenantId,
} from "./report.policy";

const tenantUser: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "22222222-2222-4222-8222-222222222222",
  email: "admin@centro.test",
  fullName: "Admin Centro",
  role: "admin",
  passwordSetByAdmin: false,
};

describe("report.policy", () => {
  it("allows super_admin, admin and director", () => {
    assert.doesNotThrow(() => assertCanUseReports({ ...tenantUser, role: "super_admin" }));
    assert.doesNotThrow(() => assertCanUseReports({ ...tenantUser, role: "admin" }));
    assert.doesNotThrow(() => assertCanUseReports({ ...tenantUser, role: "director" }));
  });

  it("rejects auditor and operational roles", () => {
    assert.throws(
      () => assertCanUseReports({ ...tenantUser, role: "auditor" }),
      ForbiddenException,
    );
    assert.throws(
      () => assertCanUseReports({ ...tenantUser, role: "nutricionista" }),
      ForbiddenException,
    );
  });

  it("requires tenant selection for super_admin", () => {
    assert.throws(
      () => resolveReportTenantId({ ...tenantUser, role: "super_admin", tenantId: null }, null),
      BadRequestException,
    );
  });

  it("forces admin and director tenant scope", () => {
    assert.equal(resolveReportTenantId(tenantUser, null), tenantUser.tenantId);
    assert.throws(
      () => resolveReportTenantId(tenantUser, "33333333-3333-4333-8333-333333333333"),
      ForbiddenException,
    );
  });

  it("protects report ownership by tenant", () => {
    assert.doesNotThrow(() =>
      assertCanAccessReportJob(tenantUser, {
        tenantId: tenantUser.tenantId!,
        requestedByUserId: "other-user",
      }),
    );
    assert.throws(
      () =>
        assertCanAccessReportJob(tenantUser, {
          tenantId: "33333333-3333-4333-8333-333333333333",
          requestedByUserId: "other-user",
        }),
      ForbiddenException,
    );
  });
});
