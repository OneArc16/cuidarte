import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canAccessAtencionIndividualHistory,
  canCreateAtencionIndividual,
  canEditAtencionIndividual,
  canEditOwnedAtencionIndividual,
  canViewAtencionIndividual,
  resolveAtencionIndividualHistoryAccess,
  resolveAtencionIndividualScope,
} from "./atencion-individual.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const medicoUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
};

const enfermeriaUser: AuthUser = {
  ...medicoUser,
  id: "bdeba5d1-ef43-4e7d-8c53-9b86c0dc9d53",
  email: "enfermeria@centro-demo.test",
  fullName: "Enfermera Centro Demo",
  role: "enfermeria",
};

const psicologoUser: AuthUser = {
  ...medicoUser,
  id: "0d516183-3e18-40ba-90d0-f4e2e978bb9a",
  email: "psicologo@centro-demo.test",
  fullName: "Psicologo Centro Demo",
  role: "psicologo",
};

const fisioterapeutaUser: AuthUser = {
  ...medicoUser,
  id: "4b8c6e1f-b2ba-437e-9d1e-bbc1848b1f4d",
  email: "fisioterapia@centro-demo.test",
  fullName: "Fisioterapeuta Centro Demo",
  role: "fisioterapeuta",
};

const adminUser: AuthUser = {
  ...medicoUser,
  id: "149ec0be-51c3-41a2-9175-2101c489ae47",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
};

const auditorUser: AuthUser = {
  ...medicoUser,
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
};

const directorUser: AuthUser = {
  ...medicoUser,
  id: "dcb4bafb-8470-43c8-81ab-76f51c0660f5",
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
};

const recreacionistaUser: AuthUser = {
  ...medicoUser,
  id: "e3ed2703-8307-4c6c-9cea-1b65ceccdb0f",
  email: "recreacion@centro-demo.test",
  fullName: "Recreacionista Centro Demo",
  role: "recreacionista",
};

describe("atencion-individual policy", () => {
  it("allows the configured clinical roles to create attention records", () => {
    assert.equal(canCreateAtencionIndividual(medicoUser), true);
    assert.equal(canCreateAtencionIndividual(psicologoUser), true);
    assert.equal(canCreateAtencionIndividual(fisioterapeutaUser), true);
    assert.equal(canCreateAtencionIndividual(enfermeriaUser), false);
    assert.equal(canCreateAtencionIndividual(adminUser), false);
    assert.equal(canCreateAtencionIndividual(directorUser), false);
  });

  it("blocks enfermeria from editing individual attention records", () => {
    assert.equal(canEditAtencionIndividual(medicoUser), true);
    assert.equal(canEditAtencionIndividual(enfermeriaUser), false);
    assert.equal(canEditAtencionIndividual(adminUser), false);
  });

  it("shows edit access only to the professional owner of the record", () => {
    const ownAtencion = { createdByUserId: medicoUser.id, createdByUserRole: medicoUser.role };
    const otherProfessionalAtencion = {
      createdByUserId: psicologoUser.id,
      createdByUserRole: psicologoUser.role,
    };

    assert.equal(resolveAtencionIndividualHistoryAccess(medicoUser, ownAtencion), "edit");
    assert.equal(canEditOwnedAtencionIndividual(medicoUser, ownAtencion), true);
    assert.equal(resolveAtencionIndividualHistoryAccess(medicoUser, otherProfessionalAtencion), null);
    assert.equal(canViewAtencionIndividual(medicoUser, otherProfessionalAtencion), false);
    assert.equal(
      resolveAtencionIndividualHistoryAccess(enfermeriaUser, {
        createdByUserId: enfermeriaUser.id,
        createdByUserRole: enfermeriaUser.role,
      }),
      "view",
    );
    assert.equal(
      resolveAtencionIndividualHistoryAccess(enfermeriaUser, {
        createdByUserId: medicoUser.id,
        createdByUserRole: medicoUser.role,
      }),
      "view",
    );
    assert.equal(
      resolveAtencionIndividualHistoryAccess(medicoUser, {
        createdByUserId: enfermeriaUser.id,
        createdByUserRole: enfermeriaUser.role,
      }),
      "view",
    );
    assert.equal(
      canEditOwnedAtencionIndividual(enfermeriaUser, {
        createdByUserId: enfermeriaUser.id,
        createdByUserRole: enfermeriaUser.role,
      }),
      false,
    );
  });

  it("shows view access to admin and director without edit permissions", () => {
    const atencion = {
      createdByUserId: psicologoUser.id,
      createdByUserRole: psicologoUser.role,
    };

    assert.equal(resolveAtencionIndividualHistoryAccess(adminUser, atencion), "view");
    assert.equal(resolveAtencionIndividualHistoryAccess(auditorUser, atencion), "view");
    assert.equal(resolveAtencionIndividualHistoryAccess(directorUser, atencion), "view");
    assert.equal(canEditOwnedAtencionIndividual(adminUser, atencion), false);
    assert.equal(canEditOwnedAtencionIndividual(auditorUser, atencion), false);
    assert.equal(canEditOwnedAtencionIndividual(directorUser, atencion), false);
  });

  it("denies history access to unsupported roles", () => {
    assert.equal(canAccessAtencionIndividualHistory(recreacionistaUser), false);
    assert.equal(
      resolveAtencionIndividualHistoryAccess(recreacionistaUser, {
        createdByUserId: recreacionistaUser.id,
        createdByUserRole: recreacionistaUser.role,
      }),
      null,
    );
  });

  it("keeps tenant users scoped to their center and super admin scoped globally", () => {
    const superAdminUser: AuthUser = {
      ...adminUser,
      id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
      tenantId: null,
      email: "superadmin@cuidarte.test",
      fullName: "Super Admin CuidarTe",
      role: "super_admin",
    };

    assert.deepEqual(resolveAtencionIndividualScope(adminUser), { type: "tenant", tenantId });
    assert.deepEqual(resolveAtencionIndividualScope(superAdminUser), { type: "all" });
  });
});
