import { z } from "zod";

import { userRoleSchema } from "./auth.js";
import { adultoMayorDocumentTypeSchema } from "./adultos-mayores.js";

const dateSchema = z.iso.date();
const nullableDateSchema = z
  .union([dateSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value === "" || value === null || value === undefined ? null : value));
const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const nullableText = (maximum: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) =>
      value === null || value === undefined || value.trim() === "" ? null : value.trim(),
    )
    .pipe(z.string().max(maximum).nullable());

export const psicologiaSessionModalitySchema = z.enum(["individual", "familiar"]);
export const psicologiaModuleRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
  "psicologo",
] as const satisfies readonly z.infer<typeof userRoleSchema>[];

export const psicologiaAdultoResumenSchema = z.object({
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

export const psicologiaAdultoListQuerySchema = z.object({
  search: z.string().trim().max(120).nullable().optional().default(null),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const psicologiaAdultoListResponseSchema = z.object({
  adultosMayores: z.array(psicologiaAdultoResumenSchema),
  total: z.number().int().min(0),
});

const psicologiaSessionCommandSchema = z
  .object({
    sessionDate: dateSchema,
    modality: psicologiaSessionModalitySchema,
    reason: requiredText(2000),
    assessment: requiredText(4000),
    intervention: requiredText(4000),
    agreements: nullableText(4000),
    nextSessionDate: nullableDateSchema,
  })
  .superRefine((session, context) => {
    if (session.nextSessionDate !== null && session.nextSessionDate < session.sessionDate) {
      context.addIssue({
        code: "custom",
        path: ["nextSessionDate"],
        message: "La próxima sesión no puede ser anterior a la sesión actual.",
      });
    }
  });

export const createPsicologiaSessionRequestSchema = psicologiaSessionCommandSchema.extend({
  adultoMayorId: z.uuid(),
});

export const psicologiaSessionSchema = psicologiaSessionCommandSchema.extend({
  id: z.uuid(),
  tenantId: z.uuid(),
  adultoMayorId: z.uuid(),
  professional: z.object({ userId: z.uuid(), fullName: z.string().min(1), role: userRoleSchema }),
  access: z.enum(["view", "edit"]),
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const psicologiaHistoryResponseSchema = z.object({
  adultoMayor: psicologiaAdultoResumenSchema,
  sessions: z.array(psicologiaSessionSchema),
});

export type PsicologiaAdultoListQuery = z.infer<typeof psicologiaAdultoListQuerySchema>;
export type PsicologiaAdultoListResponse = z.infer<typeof psicologiaAdultoListResponseSchema>;
export type PsicologiaAdultoResumen = z.infer<typeof psicologiaAdultoResumenSchema>;
export type PsicologiaSession = z.infer<typeof psicologiaSessionSchema>;
export type PsicologiaHistoryResponse = z.infer<typeof psicologiaHistoryResponseSchema>;
export type CreatePsicologiaSessionRequest = z.infer<typeof createPsicologiaSessionRequestSchema>;
