import { z } from "zod";

import { userRoleSchema } from "./auth.js";

export const actividadGrupalTypeValues = [
  "centro_vida",
  "actividad_campo",
  "sesiones_psicosocial",
  "salud_preventiva",
  "nutricion",
  "fisioterapia",
  "encuentro_intergeneracional",
  "actividades_manualidad",
  "actividades_recreacion",
] as const;

export const actividadGrupalOrganizerValues = [
  "director",
  "medico",
  "enfermeria",
  "psicologa",
  "trabajadora_social",
  "nutricionista",
  "fisioterapeuta",
  "recreacionista",
] as const;

export const actividadGrupalTypeSchema = z.enum(actividadGrupalTypeValues);
export const actividadGrupalOrganizerSchema = z.enum(actividadGrupalOrganizerValues);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

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

const nullableTenantIdSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.uuid().nullable());

const nullableActivityTypeSchema = z
  .union([actividadGrupalTypeSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return value;
  })
  .pipe(actividadGrupalTypeSchema.nullable());

const employeeIdsSchema = z
  .array(z.uuid())
  .min(1, "Selecciona minimo un empleado.")
  .refine((values) => new Set(values).size === values.length, {
    message: "No repitas empleados.",
  });

export const actividadGrupalListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
  activityType: nullableActivityTypeSchema.optional().default(null),
  tenantId: nullableTenantIdSchema.optional().default(null),
});

export const actividadGrupalTenantOptionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const actividadGrupalEmpleadoOptionSchema = z.object({
  id: z.uuid(),
  fullName: z.string().min(1).max(180),
  role: userRoleSchema,
});

export const actividadGrupalListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  actaNumber: z.number().int().min(1),
  activityName: z.string().min(1).max(160),
  activityType: actividadGrupalTypeSchema,
  activityDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  organizer: actividadGrupalOrganizerSchema,
  involvedEmployeesCount: z.number().int().min(1),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const actividadGrupalCommandSchema = z
  .object({
    activityName: requiredTextSchema(160),
    activityType: actividadGrupalTypeSchema,
    activityDate: dateSchema,
    startTime: timeSchema,
    endTime: timeSchema,
    organizer: actividadGrupalOrganizerSchema,
    employeeIds: employeeIdsSchema,
  })
  .superRefine((value, context) => {
    if (value.endTime <= value.startTime) {
      context.addIssue({
        code: "custom",
        path: ["endTime"],
        message: "La hora final debe ser posterior a la hora de inicio.",
      });
    }
  });

export const createActividadGrupalRequestSchema = actividadGrupalCommandSchema.extend({
  tenantId: nullableTenantIdSchema.optional().default(null),
});

export const actividadGrupalListResponseSchema = z.object({
  actividadesGrupales: z.array(actividadGrupalListItemSchema),
});

export const actividadGrupalFormOptionsResponseSchema = z.object({
  nextActaNumber: z.number().int().min(1),
  empleados: z.array(actividadGrupalEmpleadoOptionSchema),
});

export const actividadGrupalTenantOptionsResponseSchema = z.object({
  tenants: z.array(actividadGrupalTenantOptionSchema),
});

export type ActividadGrupalType = z.infer<typeof actividadGrupalTypeSchema>;
export type ActividadGrupalOrganizer = z.infer<typeof actividadGrupalOrganizerSchema>;
export type ActividadGrupalListQuery = z.infer<typeof actividadGrupalListQuerySchema>;
export type ActividadGrupalTenantOption = z.infer<typeof actividadGrupalTenantOptionSchema>;
export type ActividadGrupalEmpleadoOption = z.infer<typeof actividadGrupalEmpleadoOptionSchema>;
export type ActividadGrupalListItem = z.infer<typeof actividadGrupalListItemSchema>;
export type CreateActividadGrupalRequest = z.infer<typeof createActividadGrupalRequestSchema>;
export type ActividadGrupalListResponse = z.infer<typeof actividadGrupalListResponseSchema>;
export type ActividadGrupalFormOptionsResponse = z.infer<
  typeof actividadGrupalFormOptionsResponseSchema
>;
export type ActividadGrupalTenantOptionsResponse = z.infer<
  typeof actividadGrupalTenantOptionsResponseSchema
>;
