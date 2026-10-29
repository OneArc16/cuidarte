import { z } from "zod";

import { type UserRole, userRoleSchema } from "./auth.js";

const dateSchema = z.iso.date();
const nullableDateSchema = z
  .union([dateSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value === "" || value === null || value === undefined ? null : value));
const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const nullableTextSchema = (maxLength: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) => {
      if (value === null || value === undefined) {
        return null;
      }

      const trimmedValue = value.trim();
      return trimmedValue === "" ? null : trimmedValue;
    })
    .pipe(z.string().max(maxLength).nullable());

const nullableNumberSchema = (minimum: number, maximum: number) =>
  z
    .union([z.number(), z.string(), z.null(), z.undefined()])
    .transform((value, context) => {
      if (value === null || value === undefined || value === "") {
        return null;
      }

      const parsedValue = typeof value === "number" ? value : Number(value.trim());

      if (!Number.isFinite(parsedValue)) {
        context.addIssue({ code: "custom", message: "Debe ser un número válido." });
        return z.NEVER;
      }

      return parsedValue;
    })
    .pipe(z.number().min(minimum).max(maximum).nullable());

const nullableSearchSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();
    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.string().max(120).nullable());

export const nutricionPlanStatusValues = ["active", "completed", "archived"] as const;
export const nutricionMealSlotValues = [
  "desayuno",
  "media_manana",
  "almuerzo",
  "media_tarde",
  "cena",
  "colacion_nocturna",
] as const;
export const nutricionFollowUpAdherenceValues = ["alta", "media", "baja", "sin_dato"] as const;
export const nutricionHistoryAccessValues = ["view", "edit"] as const;

export const nutricionPlanStatusSchema = z.enum(nutricionPlanStatusValues);
export const nutricionMealSlotSchema = z.enum(nutricionMealSlotValues);
export const nutricionFollowUpAdherenceSchema = z.enum(nutricionFollowUpAdherenceValues);
export const nutricionHistoryAccessSchema = z.enum(nutricionHistoryAccessValues);

export const nutricionModuleRoleValues = [
  "nutricionista",
  "admin",
  "auditor",
  "director",
  "super_admin",
] as const satisfies readonly UserRole[];

export const nutricionAdultoResumenSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  documentNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(180),
  phone: z.string().max(40).nullable(),
  age: z.number().int().min(0),
  sex: z.string().min(1),
  eps: z.string().max(160).nullable(),
  healthRegime: z.string().max(120).nullable(),
});

export const nutricionAdultoListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const nutricionAdultoListResponseSchema = z.object({
  adultosMayores: z.array(nutricionAdultoResumenSchema),
  total: z.number().int().min(0),
});

export const nutricionProfessionalSchema = z.object({
  userId: z.uuid(),
  fullName: z.string().min(1).max(180),
  role: userRoleSchema,
});

export const nutricionPlanMealSchema = z.object({
  id: z.uuid(),
  slot: nutricionMealSlotSchema,
  instruction: z.string().min(1).max(2000),
  portion: z.string().max(300).nullable(),
  frequency: z.string().max(300).nullable(),
  sortOrder: z.number().int().min(0),
});

const nutricionPlanMealCommandSchema = z.object({
  slot: nutricionMealSlotSchema,
  instruction: requiredTextSchema(2000),
  portion: nullableTextSchema(300),
  frequency: nullableTextSchema(300),
});

const nutricionPlanMealsCommandSchema = z
  .array(nutricionPlanMealCommandSchema)
  .min(1, "Registra al menos una comida del plan.")
  .max(nutricionMealSlotValues.length)
  .superRefine((meals, context) => {
    const slots = new Set<string>();

    meals.forEach((meal, index) => {
      if (slots.has(meal.slot)) {
        context.addIssue({
          code: "custom",
          path: [index, "slot"],
          message: "Cada comida solo puede aparecer una vez en el plan.",
        });
      }

      slots.add(meal.slot);
    });
  });

const nutricionPlanCommandBaseSchema = z
  .object({
    startDate: dateSchema,
    nextFollowUpDate: nullableDateSchema,
    assessment: requiredTextSchema(4000),
    goal: requiredTextSchema(1500),
    recommendations: requiredTextSchema(4000),
    restrictions: nullableTextSchema(2000),
    meals: nutricionPlanMealsCommandSchema,
  })
  .superRefine((plan, context) => {
    if (plan.nextFollowUpDate !== null && plan.nextFollowUpDate < plan.startDate) {
      context.addIssue({
        code: "custom",
        path: ["nextFollowUpDate"],
        message: "El próximo control no puede ser anterior al inicio del plan.",
      });
    }
  });

export const createNutricionPlanRequestSchema = nutricionPlanCommandBaseSchema.extend({
  adultoMayorId: z.uuid(),
});

export const updateNutricionPlanRequestSchema = nutricionPlanCommandBaseSchema.extend({
  status: z.enum(["active", "completed"]),
  version: z.number().int().min(1),
});

export const createNutricionFollowUpRequestSchema = z
  .object({
    followUpDate: dateSchema,
    weightKg: nullableNumberSchema(10, 400),
    heightCm: nullableNumberSchema(50, 260),
    abdominalPerimeterCm: nullableNumberSchema(20, 250),
    adherence: nutricionFollowUpAdherenceSchema,
    progressNote: requiredTextSchema(4000),
    adjustments: nullableTextSchema(4000),
    nextFollowUpDate: nullableDateSchema,
  })
  .superRefine((followUp, context) => {
    if (followUp.nextFollowUpDate !== null && followUp.nextFollowUpDate < followUp.followUpDate) {
      context.addIssue({
        code: "custom",
        path: ["nextFollowUpDate"],
        message: "El próximo control no puede ser anterior al seguimiento.",
      });
    }
  });

export const updateNutricionFollowUpRequestSchema = createNutricionFollowUpRequestSchema.extend({
  version: z.number().int().min(1),
});

export const nutricionFollowUpSchema = z.object({
  id: z.uuid(),
  planId: z.uuid(),
  followUpDate: dateSchema,
  weightKg: z.number().min(10).max(400).nullable(),
  heightCm: z.number().min(50).max(260).nullable(),
  bodyMassIndex: z.number().min(1).max(200).nullable(),
  abdominalPerimeterCm: z.number().min(20).max(250).nullable(),
  adherence: nutricionFollowUpAdherenceSchema,
  progressNote: z.string().min(1).max(4000),
  adjustments: z.string().max(4000).nullable(),
  nextFollowUpDate: dateSchema.nullable(),
  professional: nutricionProfessionalSchema,
  access: nutricionHistoryAccessSchema,
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const nutricionPlanListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  adultoMayorId: z.uuid(),
  startDate: dateSchema,
  nextFollowUpDate: dateSchema.nullable(),
  status: nutricionPlanStatusSchema,
  goal: z.string().min(1).max(1500),
  professional: nutricionProfessionalSchema,
  access: nutricionHistoryAccessSchema,
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const nutricionPlanDetailSchema = nutricionPlanListItemSchema.extend({
  adultoMayor: nutricionAdultoResumenSchema,
  assessment: z.string().min(1).max(4000),
  recommendations: z.string().min(1).max(4000),
  restrictions: z.string().max(2000).nullable(),
  meals: z.array(nutricionPlanMealSchema),
  followUps: z.array(nutricionFollowUpSchema),
});

export const nutricionAdultoProfileResponseSchema = z.object({
  adultoMayor: nutricionAdultoResumenSchema,
  plans: z.array(nutricionPlanListItemSchema),
});

export type NutricionPlanStatus = z.infer<typeof nutricionPlanStatusSchema>;
export type NutricionMealSlot = z.infer<typeof nutricionMealSlotSchema>;
export type NutricionFollowUpAdherence = z.infer<typeof nutricionFollowUpAdherenceSchema>;
export type NutricionHistoryAccess = z.infer<typeof nutricionHistoryAccessSchema>;
export type NutricionAdultoResumen = z.infer<typeof nutricionAdultoResumenSchema>;
export type NutricionAdultoListQuery = z.infer<typeof nutricionAdultoListQuerySchema>;
export type NutricionAdultoListResponse = z.infer<typeof nutricionAdultoListResponseSchema>;
export type NutricionProfessional = z.infer<typeof nutricionProfessionalSchema>;
export type NutricionPlanMeal = z.infer<typeof nutricionPlanMealSchema>;
export type NutricionFollowUp = z.infer<typeof nutricionFollowUpSchema>;
export type NutricionPlanListItem = z.infer<typeof nutricionPlanListItemSchema>;
export type NutricionPlanDetail = z.infer<typeof nutricionPlanDetailSchema>;
export type NutricionAdultoProfileResponse = z.infer<typeof nutricionAdultoProfileResponseSchema>;
export type CreateNutricionPlanRequest = z.infer<typeof createNutricionPlanRequestSchema>;
export type UpdateNutricionPlanRequest = z.infer<typeof updateNutricionPlanRequestSchema>;
export type CreateNutricionFollowUpRequest = z.infer<typeof createNutricionFollowUpRequestSchema>;
export type UpdateNutricionFollowUpRequest = z.infer<typeof updateNutricionFollowUpRequestSchema>;
