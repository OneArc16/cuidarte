import { describe, expect, it } from "vitest";

import { canManageAlimentacion, canOpenAlimentacion } from "./alimentacion-permissions";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const directorUser = {
  id: "7b820700-fd7d-4b2e-9d61-2e4bca413c8a",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
} as const;

const adminUser = {
  ...directorUser,
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
} as const;

const superAdminUser = {
  ...directorUser,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin CuidarTe",
  role: "super_admin",
} as const;

const medicoUser = {
  ...directorUser,
  id: "eaebfa34-4ef2-4b10-b8a5-1db6d494a2a2",
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
} as const;

describe("alimentacion permissions", () => {
  it("allows only super admin, admin, and director to open the module", () => {
    expect(canOpenAlimentacion(superAdminUser)).toBe(true);
    expect(canOpenAlimentacion(adminUser)).toBe(true);
    expect(canOpenAlimentacion(directorUser)).toBe(true);
    expect(canOpenAlimentacion(medicoUser)).toBe(false);
  });

  it("allows only super admin, admin, and director to create or edit feeding records", () => {
    expect(canManageAlimentacion(superAdminUser)).toBe(true);
    expect(canManageAlimentacion(adminUser)).toBe(true);
    expect(canManageAlimentacion(directorUser)).toBe(true);
    expect(canManageAlimentacion(medicoUser)).toBe(false);
  });
});
