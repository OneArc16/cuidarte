import { describe, expect, it } from "vitest";

import {
  canCreateAtencionIndividual,
  canOpenHistoriaClinica,
  canSeeAtencionInHistoriaClinica,
  resolveHistoriaClinicaAction,
} from "./historia-clinica-permissions";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const medicoUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
} as const;

const nutricionistaUser = {
  ...medicoUser,
  id: "b2338d7a-fa31-4d3a-a524-889595f54e8f",
  email: "nutricion@centro-demo.test",
  fullName: "Nutricionista Centro Demo",
  role: "nutricionista",
} as const;

const directorUser = {
  ...medicoUser,
  id: "dcb4bafb-8470-43c8-81ab-76f51c0660f5",
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
} as const;

const enfermeriaUser = {
  ...medicoUser,
  id: "bdeba5d1-ef43-4e7d-8c53-9b86c0dc9d53",
  email: "enfermeria@centro-demo.test",
  fullName: "Enfermera Centro Demo",
  role: "enfermeria",
} as const;

const adminUser = {
  ...medicoUser,
  id: "149ec0be-51c3-41a2-9175-2101c489ae47",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
} as const;

const auditorUser = {
  ...medicoUser,
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
} as const;

const recreacionistaUser = {
  ...medicoUser,
  id: "e3ed2703-8307-4c6c-9cea-1b65ceccdb0f",
  email: "recreacion@centro-demo.test",
  fullName: "Recreacionista Centro Demo",
  role: "recreacionista",
} as const;

describe("historia clinica permissions", () => {
  it("allows eligible roles to open the clinical history module", () => {
    expect(canOpenHistoriaClinica(medicoUser)).toBe(true);
    expect(canOpenHistoriaClinica(nutricionistaUser)).toBe(true);
    expect(canOpenHistoriaClinica(adminUser)).toBe(true);
    expect(canOpenHistoriaClinica(auditorUser)).toBe(true);
    expect(canOpenHistoriaClinica(directorUser)).toBe(true);
    expect(canOpenHistoriaClinica(recreacionistaUser)).toBe(false);
  });

  it("allows only clinical roles to create individual attention records", () => {
    expect(canCreateAtencionIndividual(medicoUser)).toBe(true);
    expect(canCreateAtencionIndividual(nutricionistaUser)).toBe(true);
    expect(canCreateAtencionIndividual(enfermeriaUser)).toBe(false);
    expect(canCreateAtencionIndividual(adminUser)).toBe(false);
    expect(canCreateAtencionIndividual(auditorUser)).toBe(false);
    expect(canCreateAtencionIndividual(directorUser)).toBe(false);
  });

  it("resolves edit for professionals only when they own the attention", () => {
    expect(resolveHistoriaClinicaAction(medicoUser, { createdByUserId: medicoUser.id })).toBe(
      "edit",
    );
    expect(
      resolveHistoriaClinicaAction(enfermeriaUser, {
        createdByUserId: enfermeriaUser.id,
        createdByUserRole: enfermeriaUser.role,
      }),
    ).toBe("view");
    expect(
      resolveHistoriaClinicaAction(medicoUser, {
        createdByUserId: nutricionistaUser.id,
      }),
    ).toBeNull();
    expect(
      canSeeAtencionInHistoriaClinica(medicoUser, {
        createdByUserId: nutricionistaUser.id,
      }),
    ).toBe(false);
  });

  it("resolves view for admin and director over any attention", () => {
    expect(
      resolveHistoriaClinicaAction(adminUser, {
        createdByUserId: nutricionistaUser.id,
      }),
    ).toBe("view");
    expect(
      resolveHistoriaClinicaAction(auditorUser, {
        createdByUserId: medicoUser.id,
      }),
    ).toBe("view");
    expect(
      resolveHistoriaClinicaAction(directorUser, {
        createdByUserId: medicoUser.id,
      }),
    ).toBe("view");
  });
});
