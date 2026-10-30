import { z } from "zod";

import { adultoMayorDocumentTypeSchema } from "./adultos-mayores.js";
import { userRoleSchema } from "./auth.js";

const dateSchema = z.iso.date();
const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const nullableText = (maximum: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) =>
      value === null || value === undefined || value.trim() === "" ? null : value.trim(),
    )
    .pipe(z.string().max(maximum).nullable());
const nullableDateSchema = z
  .union([dateSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value === "" || value === null || value === undefined ? null : value));

export const trabajoSocialSessionModalitySchema = z.enum(["individual", "familiar"]);
export const trabajoSocialModuleRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
  "trabajadora_social",
] as const satisfies readonly z.infer<typeof userRoleSchema>[];

export const trabajoSocialAdultoResumenSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  documentType: adultoMayorDocumentTypeSchema,
  documentNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(180),
  phone: z.string().max(40).nullable(),
  age: z.number().int().min(0),
  sex: z.string().min(1),
  eps: z.string().max(160).nullable(),
});
export const trabajoSocialAdultoListQuerySchema = z.object({
  search: z.string().trim().max(120).nullable().optional().default(null),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export const trabajoSocialAdultoListResponseSchema = z.object({
  adultosMayores: z.array(trabajoSocialAdultoResumenSchema),
  total: z.number().int().min(0),
});

const trabajoSocialSessionCommandSchema = z
  .object({
    sessionDate: dateSchema,
    modality: trabajoSocialSessionModalitySchema,
    reason: requiredText(2000),
    socialAssessment: requiredText(4000),
    intervention: requiredText(4000),
    agreements: nullableText(4000),
    nextSessionDate: nullableDateSchema,
  })
  .superRefine((session, context) => {
    if (session.nextSessionDate !== null && session.nextSessionDate < session.sessionDate) {
      context.addIssue({
        code: "custom",
        path: ["nextSessionDate"],
        message: "La próxima atención no puede ser anterior a la atención actual.",
      });
    }
  });

export const createTrabajoSocialSessionRequestSchema = trabajoSocialSessionCommandSchema.extend({
  adultoMayorId: z.uuid(),
});
export const trabajoSocialSessionSchema = trabajoSocialSessionCommandSchema.extend({
  id: z.uuid(),
  tenantId: z.uuid(),
  adultoMayorId: z.uuid(),
  professional: z.object({ userId: z.uuid(), fullName: z.string().min(1), role: userRoleSchema }),
  access: z.enum(["view", "edit"]),
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export const trabajoSocialHistoryResponseSchema = z.object({
  adultoMayor: trabajoSocialAdultoResumenSchema,
  sessions: z.array(trabajoSocialSessionSchema),
});

export type TrabajoSocialAdultoListQuery = z.infer<typeof trabajoSocialAdultoListQuerySchema>;
export type TrabajoSocialAdultoResumen = z.infer<typeof trabajoSocialAdultoResumenSchema>;
export type TrabajoSocialHistoryResponse = z.infer<typeof trabajoSocialHistoryResponseSchema>;
export type CreateTrabajoSocialSessionRequest = z.infer<
  typeof createTrabajoSocialSessionRequestSchema
>;
