import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";

import {
  canCreateNutricion,
  canEditNutricionRecord,
  canManageNutricion,
  canOpenNutricion,
  resolveNutricionScope,
} from "./nutricion.policy";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

const nutricionista: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId,
  email: "nutricion@centro.test",
  fullName: "Nutricionista Centro",
  role: "nutricionista",
  passwordSetByAdmin: true,
};

const director: AuthUser = {
  id: "22222222-2222-4222-8222-222222222222",
  tenantId,
  email: "director@centro.test",
  fullName: "Director Centro",
  role: "director",
  passwordSetByAdmin: true,
};

describe("nutricion.policy", () => {
  it("opens and creates plans for the nutrition role", () => {
    assert.equal(canOpenNutricion(nutricionista), true);
    assert.equal(canCreateNutricion(nutricionista), true);
    assert.equal(canManageNutricion(nutricionista), false);
    assert.deepEqual(resolveNutricionScope(nutricionista), { type: "tenant", tenantId });
  });

  it("allows the director to manage records in their tenant", () => {
    const record = { tenantId, createdByUserId: nutricionista.id };

    assert.equal(canManageNutricion(director), true);
    assert.equal(canEditNutricionRecord(director, record), true);
    assert.equal(canEditNutricionRecord(nutricionista, record), true);
  });

  it("does not grant access across tenants or without the dedicated permission", () => {
    const record = { tenantId, createdByUserId: nutricionista.id };
    const otherTenantNutritionist: AuthUser = {
      ...nutricionista,
      tenantId: "8c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    };

    assert.equal(canEditNutricionRecord(otherTenantNutritionist, record), false);
    assert.equal(
      canOpenNutricion({
        role: "nutricionista",
        permissions: ["adultos_mayores.view"],
      }),
      false,
    );
    assert.equal(
      canOpenNutricion({ role: "nutricionista", permissions: ["nutricion.view"] }),
      true,
    );
  });
});
