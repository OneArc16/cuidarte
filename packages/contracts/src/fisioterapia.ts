import { z } from "zod";

import { userRoleSchema } from "./auth.js";
import { adultoMayorDocumentTypeSchema } from "./adultos-mayores.js";

const dateSchema = z.iso.date();
const nullableDateSchema = z
  .union([dateSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => (value === "" || value === null || value === undefined ? null : value));
const textSchema = (maximum: number) => z.string().trim().min(1).max(maximum);
const nullableTextSchema = (maximum: number) =>
  z
    .union([z.string(), z.null(), z.undefined()])
    .transform((value) =>
      value === null || value === undefined || value.trim() === "" ? null : value.trim(),
    )
    .pipe(z.string().max(maximum).nullable());

export const fisioterapiaSessionModalitySchema = z.enum(["individual", "grupal", "domiciliaria"]);
export const fisioterapiaModuleRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
  "fisioterapeuta",
] as const satisfies readonly z.infer<typeof userRoleSchema>[];

export const fisioterapiaAdultoResumenSchema = z.object({
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
export const fisioterapiaAdultoListQuerySchema = z.object({
  search: z.string().trim().max(120).nullable().optional().default(null),
  page: z.coerce.number().int().min(1).max(10_000).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(100).optional().default(20),
});
export const fisioterapiaAdultoListResponseSchema = z.object({
  adultosMayores: z.array(fisioterapiaAdultoResumenSchema),
  total: z.number().int().min(0),
});
const fisioterapiaSessionCommandSchema = z
  .object({
    sessionDate: dateSchema,
    modality: fisioterapiaSessionModalitySchema,
    reason: textSchema(2000),
    functionalAssessment: textSchema(4000),
    intervention: textSchema(4000),
    evolution: nullableTextSchema(4000),
    nextSessionDate: nullableDateSchema,
  })
  .superRefine((session, context) => {
    if (session.nextSessionDate !== null && session.nextSessionDate < session.sessionDate) {
      context.addIssue({
        code: "custom",
        path: ["nextSessionDate"],
        message: "La próxima sesión no puede ser anterior.",
      });
    }
  });
export const createFisioterapiaSessionRequestSchema = fisioterapiaSessionCommandSchema.extend({
  adultoMayorId: z.uuid(),
});
export const fisioterapiaSessionSchema = fisioterapiaSessionCommandSchema.extend({
  id: z.uuid(),
  tenantId: z.uuid(),
  adultoMayorId: z.uuid(),
  professional: z.object({ userId: z.uuid(), fullName: z.string().min(1), role: userRoleSchema }),
  access: z.enum(["view", "edit"]),
  version: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});
export const fisioterapiaHistoryResponseSchema = z.object({
  adultoMayor: fisioterapiaAdultoResumenSchema,
  sessions: z.array(fisioterapiaSessionSchema),
});
export type FisioterapiaAdultoResumen = z.infer<typeof fisioterapiaAdultoResumenSchema>;
export type FisioterapiaAdultoListQuery = z.infer<typeof fisioterapiaAdultoListQuerySchema>;
export type FisioterapiaAdultoListResponse = z.infer<typeof fisioterapiaAdultoListResponseSchema>;
export type CreateFisioterapiaSessionRequest = z.infer<
  typeof createFisioterapiaSessionRequestSchema
>;
export type FisioterapiaHistoryResponse = z.infer<typeof fisioterapiaHistoryResponseSchema>;
