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

export const actividadGrupalResponsibleDepartmentValues = [
  "direccion",
  "medicina",
  "enfermeria",
  "psicologia",
  "trabajo_social",
  "nutricion",
  "fisioterapia",
  "recreacion",
] as const;

export const actividadGrupalSupportFileKindValues = ["support_photo", "support_pdf"] as const;

export const actividadGrupalTypeSchema = z.enum(actividadGrupalTypeValues);
export const actividadGrupalOrganizerSchema = z.enum(actividadGrupalOrganizerValues);
export const actividadGrupalResponsibleDepartmentSchema = z.enum(
  actividadGrupalResponsibleDepartmentValues,
);
export const actividadGrupalSupportFileKindSchema = z.enum(actividadGrupalSupportFileKindValues);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const requiredLongTextSchema = (message: string) => z.string().trim().min(1, message);
const actaNumberSchema = requiredTextSchema(40);

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

const nullableOrganizerSchema = z
  .union([actividadGrupalOrganizerSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return value;
  })
  .pipe(actividadGrupalOrganizerSchema.nullable());

const nullableResponsibleDepartmentSchema = z
  .union([actividadGrupalResponsibleDepartmentSchema, z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return value;
  })
  .pipe(actividadGrupalResponsibleDepartmentSchema.nullable());

const nullableMonthSchema = z
  .union([z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/), z.literal(""), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined || value === "") {
      return null;
    }

    return value;
  })
  .pipe(
    z
      .string()
      .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
      .nullable(),
  );

const employeeIdsSchema = z
  .array(z.uuid())
  .min(1, "Selecciona minimo un empleado.")
  .refine((values) => new Set(values).size === values.length, {
    message: "No repitas empleados.",
  });

const integranteIdsSchema = z
  .array(z.uuid())
  .refine((values) => new Set(values).size === values.length, {
    message: "No repitas integrantes.",
  });

const removableFileIdsSchema = z
  .array(z.uuid())
  .refine((values) => new Set(values).size === values.length, {
    message: "No repitas archivos.",
  });

export const actividadGrupalListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
  activityType: nullableActivityTypeSchema.optional().default(null),
  organizer: nullableOrganizerSchema.optional().default(null),
  activityMonth: nullableMonthSchema.optional().default(null),
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

export const actividadGrupalIntegranteOptionSchema = z.object({
  id: z.uuid(),
  documentNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(180),
});

export const actividadGrupalSupportFileSchema = z.object({
  id: z.uuid(),
  kind: actividadGrupalSupportFileKindSchema,
  originalName: z.string().min(1).max(260),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
  createdAt: z.string().min(1),
});

export const actividadGrupalListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  actaNumber: actaNumberSchema,
  activityName: z.string().min(1).max(160),
  activityType: actividadGrupalTypeSchema,
  activityDate: dateSchema,
  startTime: timeSchema,
  endTime: timeSchema,
  organizer: actividadGrupalOrganizerSchema,
  involvedEmployeesCount: z.number().int().min(1),
  canEdit: z.boolean(),
  canDelete: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const actividadGrupalCommandSchema = z
  .object({
    actaNumber: actaNumberSchema,
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

export const updateActividadGrupalRequestSchema = actividadGrupalCommandSchema;

export const saveActividadGrupalDiligenciamientoSchema = z.object({
  objectives: requiredLongTextSchema("Ingresa los objetivos de la sesión."),
  development: requiredLongTextSchema("Ingresa el desarrollo de la sesión."),
  conclusion: requiredLongTextSchema("Ingresa la conclusión de la sesión."),
  responsibleDepartment: actividadGrupalResponsibleDepartmentSchema,
  integranteIds: integranteIdsSchema,
  removedPhotoFileIds: removableFileIdsSchema.optional().default([]),
  removePdfFile: z.boolean().optional().default(false),
});

export const actividadGrupalDiligenciamientoDetailSchema = actividadGrupalListItemSchema.extend({
  assignedProfessionals: z.array(actividadGrupalEmpleadoOptionSchema),
  objectives: z.string(),
  development: z.string(),
  conclusion: z.string(),
  responsibleDepartment: nullableResponsibleDepartmentSchema,
  integrantes: z.array(actividadGrupalIntegranteOptionSchema),
  photoFiles: z.array(actividadGrupalSupportFileSchema),
  pdfFile: actividadGrupalSupportFileSchema.nullable(),
  diligenciamientoCreatedAt: z.string().nullable(),
  diligenciamientoUpdatedAt: z.string().nullable(),
});

export const actividadGrupalEditDetailSchema = actividadGrupalListItemSchema.extend({
  employeeIds: z.array(z.uuid()),
});

export const actividadGrupalIntegranteOptionsQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
});

export const actividadGrupalListResponseSchema = z.object({
  actividadesGrupales: z.array(actividadGrupalListItemSchema),
});

export const actividadGrupalTrashListItemSchema = actividadGrupalListItemSchema.extend({
  deletedAt: z.string().min(1),
  deletedByUserId: z.uuid(),
  deletedByUserFullName: z.string().min(1).max(180),
  canRestore: z.boolean(),
});

export const actividadGrupalTrashListQuerySchema = actividadGrupalListQuerySchema;

export const actividadGrupalTrashListResponseSchema = z.object({
  actividadesGrupales: z.array(actividadGrupalTrashListItemSchema),
});

export const actividadGrupalFormOptionsResponseSchema = z.object({
  nextActaNumber: z.number().int().min(1),
  empleados: z.array(actividadGrupalEmpleadoOptionSchema),
});

export const actividadGrupalTenantOptionsResponseSchema = z.object({
  tenants: z.array(actividadGrupalTenantOptionSchema),
});

export const actividadGrupalIntegranteOptionsResponseSchema = z.object({
  integrantes: z.array(actividadGrupalIntegranteOptionSchema),
});

export const deleteActividadGrupalResponseSchema = z.object({
  success: z.literal(true),
});

export const restoreActividadGrupalResponseSchema = z.object({
  success: z.literal(true),
});

export type ActividadGrupalType = z.infer<typeof actividadGrupalTypeSchema>;
export type ActividadGrupalOrganizer = z.infer<typeof actividadGrupalOrganizerSchema>;
export type ActividadGrupalResponsibleDepartment = z.infer<
  typeof actividadGrupalResponsibleDepartmentSchema
>;
export type ActividadGrupalSupportFileKind = z.infer<typeof actividadGrupalSupportFileKindSchema>;
export type ActividadGrupalListQuery = z.infer<typeof actividadGrupalListQuerySchema>;
export type ActividadGrupalTenantOption = z.infer<typeof actividadGrupalTenantOptionSchema>;
export type ActividadGrupalEmpleadoOption = z.infer<typeof actividadGrupalEmpleadoOptionSchema>;
export type ActividadGrupalIntegranteOption = z.infer<typeof actividadGrupalIntegranteOptionSchema>;
export type ActividadGrupalSupportFile = z.infer<typeof actividadGrupalSupportFileSchema>;
export type ActividadGrupalTrashListItem = z.infer<typeof actividadGrupalTrashListItemSchema>;
export type ActividadGrupalTrashListResponse = z.infer<
  typeof actividadGrupalTrashListResponseSchema
>;
export type RestoreActividadGrupalResponse = z.infer<typeof restoreActividadGrupalResponseSchema>;
export type ActividadGrupalListItem = z.infer<typeof actividadGrupalListItemSchema>;
export type CreateActividadGrupalRequest = z.infer<typeof createActividadGrupalRequestSchema>;
export type UpdateActividadGrupalRequest = z.infer<typeof updateActividadGrupalRequestSchema>;
export type SaveActividadGrupalDiligenciamiento = z.infer<
  typeof saveActividadGrupalDiligenciamientoSchema
>;
export type ActividadGrupalDiligenciamientoDetail = z.infer<
  typeof actividadGrupalDiligenciamientoDetailSchema
>;
export type ActividadGrupalEditDetail = z.infer<typeof actividadGrupalEditDetailSchema>;
export type ActividadGrupalIntegranteOptionsQuery = z.infer<
  typeof actividadGrupalIntegranteOptionsQuerySchema
>;
export type ActividadGrupalListResponse = z.infer<typeof actividadGrupalListResponseSchema>;
export type ActividadGrupalFormOptionsResponse = z.infer<
  typeof actividadGrupalFormOptionsResponseSchema
>;
export type ActividadGrupalTenantOptionsResponse = z.infer<
  typeof actividadGrupalTenantOptionsResponseSchema
>;
export type ActividadGrupalIntegranteOptionsResponse = z.infer<
  typeof actividadGrupalIntegranteOptionsResponseSchema
>;
export type DeleteActividadGrupalResponse = z.infer<typeof deleteActividadGrupalResponseSchema>;
