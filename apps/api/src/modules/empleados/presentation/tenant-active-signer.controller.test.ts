import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import { TenantActiveSignerController } from "./tenant-active-signer.controller";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

describe("TenantActiveSignerController", () => {
  it("returns the active signer for a tenant", async () => {
    const controller = new TenantActiveSignerController({
      async findTenantActiveSignerByTenantId(tenantId: string) {
        return {
          tenantId,
          employeeId: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
          signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
          activatedByUserId: currentUser.id,
          activatedAt: new Date("2026-08-09T12:00:00.000Z"),
          updatedAt: new Date("2026-08-09T12:00:00.000Z"),
        };
      },
    } as never);

    const result = await controller.getActiveSigner(
      "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      { currentUser } as never,
    );

    assert.equal(result.activeSigner?.employeeId, "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72");
  });

  it("activates a tenant signer through the service", async () => {
    let receivedTenantId: string | null = null;
    let receivedCommand: unknown;
    const controller = new TenantActiveSignerController({
      async setTenantActiveSigner(tenantId: string, command: unknown) {
        receivedTenantId = tenantId;
        receivedCommand = command;

        return {
          tenantId,
          employeeId: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
          signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
          activatedByUserId: currentUser.id,
          activatedAt: new Date("2026-08-09T12:00:00.000Z"),
          updatedAt: new Date("2026-08-09T12:00:00.000Z"),
        };
      },
    } as never);

    const result = await controller.setActiveSigner(
      "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      {
        employeeId: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
        signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
      },
      { currentUser } as never,
    );

    assert.equal(receivedTenantId, "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054");
    assert.deepEqual(receivedCommand, {
      employeeId: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
      signatureVersionId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
    });
    assert.equal(result.activeSigner?.employeeId, "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72");
  });

  it("clears a tenant signer through the service", async () => {
    let receivedTenantId: string | null = null;
    const controller = new TenantActiveSignerController({
      async clearTenantActiveSigner(tenantId: string) {
        receivedTenantId = tenantId;
        return null;
      },
    } as never);

    const result = await controller.clearActiveSigner(
      "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      { currentUser } as never,
    );

    assert.equal(receivedTenantId, "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054");
    assert.equal(result.activeSigner, null);
  });
});
