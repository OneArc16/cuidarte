import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";

import { homeDashboardAccessRoleValues } from "@cuidarte/contracts";
import { REQUIRED_ROLES_KEY } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { HomeController } from "./home.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("HomeController", () => {
  it("protects the dashboard with the expected roles and guards", () => {
    assert.deepEqual(Reflect.getMetadata(REQUIRED_ROLES_KEY, HomeController), [
      ...homeDashboardAccessRoleValues,
    ]);
    assert.deepEqual(Reflect.getMetadata(GUARDS_METADATA, HomeController), [
      SessionGuard,
      RolesGuard,
    ]);
  });

  it("passes the current user to the dashboard service", async () => {
    let receivedActorId: string | null = null;
    const service = {
      getDashboard: async (actor: AuthUser) => {
        receivedActorId = actor.id;

        return {
          shortcuts: [
            {
              moduleId: "adultos-mayores",
              total: 468,
            },
          ],
          indicators: [
            {
              id: "adultos_registrados",
              total: 468,
            },
          ],
        };
      },
    };
    const controller = new HomeController(service as never);

    const result = await controller.getDashboard({ currentUser } as never);

    assert.equal(receivedActorId, currentUser.id);
    assert.deepEqual(result.shortcuts, [
      {
        moduleId: "adultos-mayores",
        total: 468,
      },
    ]);
    assert.deepEqual(result.indicators, [
      {
        id: "adultos_registrados",
        total: 468,
      },
    ]);
  });
});
