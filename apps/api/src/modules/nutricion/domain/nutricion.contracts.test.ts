import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  createNutricionFollowUpRequestSchema,
  createNutricionPlanRequestSchema,
} from "@cuidarte/contracts";

const adultoMayorId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";

describe("nutricion contracts", () => {
  it("normalizes optional plan fields and retains meal detail", () => {
    const parsed = createNutricionPlanRequestSchema.parse({
      adultoMayorId,
      startDate: "2026-10-29",
      nextFollowUpDate: "",
      assessment: "Valoración inicial.",
      goal: "Mejorar la adherencia alimentaria.",
      recommendations: "Hidratación y horarios regulares.",
      restrictions: "  ",
      meals: [
        {
          slot: "desayuno",
          instruction: "Fruta, cereal y proteína.",
          portion: "1 porción",
          frequency: "Diario",
        },
      ],
    });

    assert.equal(parsed.nextFollowUpDate, null);
    assert.equal(parsed.restrictions, null);
    assert.equal(parsed.meals[0]?.slot, "desayuno");
  });

  it("rejects duplicate meal slots and invalid measurements", () => {
    const duplicatedMealPlan = createNutricionPlanRequestSchema.safeParse({
      adultoMayorId,
      startDate: "2026-10-29",
      assessment: "Valoración inicial.",
      goal: "Mejorar la adherencia alimentaria.",
      recommendations: "Hidratación y horarios regulares.",
      meals: [
        { slot: "desayuno", instruction: "Opción uno" },
        { slot: "desayuno", instruction: "Opción dos" },
      ],
    });
    const invalidFollowUp = createNutricionFollowUpRequestSchema.safeParse({
      followUpDate: "2026-10-29",
      weightKg: "4",
      heightCm: "160",
      abdominalPerimeterCm: null,
      adherence: "alta",
      progressNote: "Seguimiento realizado.",
      adjustments: null,
      nextFollowUpDate: null,
    });
    const invalidFollowUpDateOrder = createNutricionFollowUpRequestSchema.safeParse({
      followUpDate: "2026-10-29",
      weightKg: "65",
      heightCm: "160",
      abdominalPerimeterCm: null,
      adherence: "alta",
      progressNote: "Seguimiento realizado.",
      adjustments: null,
      nextFollowUpDate: "2026-10-28",
    });

    assert.equal(duplicatedMealPlan.success, false);
    assert.equal(invalidFollowUp.success, false);
    assert.equal(invalidFollowUpDateOrder.success, false);
  });
});
