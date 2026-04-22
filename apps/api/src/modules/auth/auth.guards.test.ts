import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { type AuthUser } from "@cuidarte/contracts";
import { ForbiddenException, UnauthorizedException, type ExecutionContext } from "@nestjs/common";
import { type Reflector } from "@nestjs/core";

import { type MaybeAuthenticatedRequest } from "./authenticated-request";
import { RolesGuard } from "./roles.guard";
import { SessionGuard } from "./session.guard";

const superAdminUser: AuthUser = {
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "SuperAdmin Cuidarte",
  role: "super_admin",
  passwordSetByAdmin: true,
};

const tenantAdminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "tenant_admin",
  passwordSetByAdmin: true,
};

describe("SessionGuard", () => {
  it("throws UnauthorizedException when no authenticated user is resolved", async () => {
    const guard = new SessionGuard({
      getCurrentUser: async () => null,
    } as never);
    const request = createRequest();

    await assert.rejects(() => guard.canActivate(createExecutionContext(request)), {
      constructor: UnauthorizedException,
    });
  });

  it("attaches the current user to the request", async () => {
    const guard = new SessionGuard({
      getCurrentUser: async () => superAdminUser,
    } as never);
    const request = createRequest("cuidarte_session=test-token");

    const result = await guard.canActivate(createExecutionContext(request));

    assert.equal(result, true);
    assert.deepEqual(request.currentUser, superAdminUser);
  });
});

describe("RolesGuard", () => {
  it("throws ForbiddenException when the current user lacks the required role", () => {
    const guard = new RolesGuard(createReflector(["super_admin"]));
    const request = createRequest();
    request.currentUser = tenantAdminUser;

    assert.throws(() => guard.canActivate(createExecutionContext(request)), {
      constructor: ForbiddenException,
    });
  });

  it("allows a SuperAdmin user for SuperAdmin-only routes", () => {
    const guard = new RolesGuard(createReflector(["super_admin"]));
    const request = createRequest();
    request.currentUser = superAdminUser;

    assert.equal(guard.canActivate(createExecutionContext(request)), true);
  });

  it("throws UnauthorizedException when roles are required but SessionGuard did not run", () => {
    const guard = new RolesGuard(createReflector(["super_admin"]));

    assert.throws(() => guard.canActivate(createExecutionContext(createRequest())), {
      constructor: UnauthorizedException,
    });
  });
});

function createRequest(cookie?: string): MaybeAuthenticatedRequest {
  const headers = cookie === undefined ? {} : { cookie };

  return { headers } as MaybeAuthenticatedRequest;
}

function createExecutionContext(request: MaybeAuthenticatedRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => function handler() {},
    getClass: () => class TestController {},
  } as unknown as ExecutionContext;
}

function createReflector(requiredRoles: readonly string[]): Reflector {
  return {
    getAllAndOverride: () => requiredRoles,
  } as unknown as Reflector;
}
