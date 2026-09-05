import { describe, expect, it } from "vitest";

import { resolveTenantActiveSignerAction } from "./empleados-active-signer";

const activeSigner = {
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  employeeId: "2b93919b-182e-49a9-a61c-85f55428061b",
  signatureVersionId: "7cf28395-e93e-420f-b7e0-92314361a02b",
  activatedByUserId: "68c499c2-8805-423d-8c7a-fc2649fab102",
  activatedAt: "2026-08-09T12:00:00.000Z",
  updatedAt: "2026-08-09T12:00:00.000Z",
};

describe("resolveTenantActiveSignerAction", () => {
  it("updates the active version when the same director uploaded a newer signature", () => {
    expect(
      resolveTenantActiveSignerAction({
        activeSigner,
        employeeId: activeSigner.employeeId,
        latestSignatureId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
      }),
    ).toBe("update");
  });

  it("deactivates only when the director and signature version are already active", () => {
    expect(
      resolveTenantActiveSignerAction({
        activeSigner,
        employeeId: activeSigner.employeeId,
        latestSignatureId: activeSigner.signatureVersionId,
      }),
    ).toBe("deactivate");
  });

  it("activates another director when a signature is available", () => {
    expect(
      resolveTenantActiveSignerAction({
        activeSigner,
        employeeId: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
        latestSignatureId: "dc8e2c42-8f96-4f19-b204-adf90e139bf4",
      }),
    ).toBe("activate");
  });

  it("disables activation when no signature is available", () => {
    expect(
      resolveTenantActiveSignerAction({
        activeSigner: null,
        employeeId: activeSigner.employeeId,
        latestSignatureId: null,
      }),
    ).toBe("unavailable");
  });
});
