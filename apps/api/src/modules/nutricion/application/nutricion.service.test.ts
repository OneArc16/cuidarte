import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser, type CreateNutricionFollowUpRequest } from "@cuidarte/contracts";
import { ForbiddenException } from "@nestjs/common";

import { NutricionService } from "./nutricion.service";
import { type NutricionRepository } from "../domain/nutricion.repository";
import { type NutricionPlanRecord } from "../domain/nutricion.types";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const professionalId = "11111111-1111-4111-8111-111111111111";
const otherProfessionalId = "22222222-2222-4222-8222-222222222222";
const planId = "33333333-3333-4333-8333-333333333333";

const nutritionist: AuthUser = {
  id: professionalId,
  tenantId,
  email: "nutricion@centro.test",
  fullName: "Nutricionista Centro",
  role: "nutricionista",
  passwordSetByAdmin: true,
};

const followUp: CreateNutricionFollowUpRequest = {
  followUpDate: "2026-10-29",
  weightKg: 65,
  heightCm: 160,
  abdominalPerimeterCm: null,
  adherence: "alta",
  progressNote: "Control realizado sin novedades.",
  adjustments: null,
  nextFollowUpDate: null,
};

describe("NutricionService", () => {
  it("does not allow a nutritionist to add follow-ups to another professional's plan", async () => {
    const plan = {
      id: planId,
      tenantId,
      status: "active",
      createdByUserId: otherProfessionalId,
    } as NutricionPlanRecord;
    let createFollowUpCalls = 0;
    const repository = {
      findPlanById: async () => plan,
      createFollowUp: async () => {
        createFollowUpCalls += 1;
        return { id: "44444444-4444-4444-8444-444444444444" };
      },
    } as unknown as NutricionRepository;
    const service = new NutricionService(repository);

    await assert.rejects(
      service.createFollowUp(planId, followUp, nutritionist),
      (error: unknown) => error instanceof ForbiddenException,
    );
    assert.equal(createFollowUpCalls, 0);
  });
});
