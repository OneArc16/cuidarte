import { z } from "zod";

import { type UserRole } from "./auth.js";

export const alimentacionStatusValues = ["entregado", "no_entregado", "no_aplica"] as const;

export const alimentacionOrganizerValues = [
  "director",
  "medico",
  "enfermeria",
  "psicologa",
  "trabajadora_social",
  "nutricionista",
  "fisioterapeuta",
  "recreacionista",
] as const;

export const alimentacionAccessRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
] as const satisfies readonly UserRole[];

export const alimentacionEditorRoleValues = [
  "super_admin",
  "admin",
  "director",
] as const satisfies readonly UserRole[];

export const alimentacionStatusSchema = z.enum(alimentacionStatusValues);
export const alimentacionOrganizerSchema = z.enum(alimentacionOrganizerValues);

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const alimentacionDeliveryMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

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

const nullableMonthSchema = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((value) => {
    if (value === null || value === undefined) {
      return null;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(alimentacionDeliveryMonthSchema.nullable());

const alimentacionBatchRecordSchema = z.object({
  adultoMayorId: z.uuid(),
  refrigerio1: alimentacionStatusSchema,
  almuerzo: alimentacionStatusSchema,
  refrigerio2: alimentacionStatusSchema,
  auxilioTransporte: alimentacionStatusSchema,
});

export const alimentacionListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
  deliveryMonth: nullableMonthSchema.optional().default(null),
  tenantId: nullableTenantIdSchema.optional().default(null),
});

export const alimentacionAdultoOptionsQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
  deliveryDate: dateSchema,
  tenantId: nullableTenantIdSchema.optional().default(null),
});

export const alimentacionLookupByAdultoMayorQuerySchema = z.object({
  deliveryDate: dateSchema,
});

export const alimentacionFormatoEntregaExportQuerySchema = z.object({
  deliveryMonth: alimentacionDeliveryMonthSchema,
});

export const alimentacionImportedFormatoVersionSchema = z.object({
  id: z.uuid(),
  version: z.number().int().positive(),
  originalName: z.string().min(1).max(260),
  mimeType: z.literal("application/pdf"),
  sizeBytes: z.number().int().positive(),
  importedByUserId: z.uuid(),
  importedByUserFullName: z.string().min(1).max(180),
  importedAt: z.string().min(1),
});

export const alimentacionImportedFormatoVersionsResponseSchema = z.object({
  versions: z.array(alimentacionImportedFormatoVersionSchema),
});

export const alimentacionImportedFormatoUploadResponseSchema = z.object({
  version: alimentacionImportedFormatoVersionSchema,
});

export const alimentacionTenantOptionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const alimentacionAdultoOptionSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  documentNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(180),
});

export const alimentacionListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  adultoMayorId: z.uuid(),
  documentNumber: z.string().min(1).max(80),
  fullName: z.string().min(1).max(180),
  deliveryDate: dateSchema,
  organizer: alimentacionOrganizerSchema,
  refrigerio1: alimentacionStatusSchema,
  almuerzo: alimentacionStatusSchema,
  refrigerio2: alimentacionStatusSchema,
  auxilioTransporte: alimentacionStatusSchema,
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
  importedFormato: alimentacionImportedFormatoVersionSchema.nullable().optional().default(null),
});

export const alimentacionDetailSchema = alimentacionListItemSchema;

export const createAlimentacionBatchRequestSchema = z.object({
  tenantId: nullableTenantIdSchema.optional().default(null),
  deliveryDate: dateSchema,
  organizer: alimentacionOrganizerSchema,
  registros: z
    .array(alimentacionBatchRecordSchema)
    .min(1, "Agrega minimo un adulto mayor.")
    .refine(
      (records) => new Set(records.map((record) => record.adultoMayorId)).size === records.length,
      {
        message: "No repitas adultos mayores en el mismo registro.",
      },
    ),
});

export const updateAlimentacionRequestSchema = z.object({
  deliveryDate: dateSchema,
  organizer: alimentacionOrganizerSchema,
  refrigerio1: alimentacionStatusSchema,
  almuerzo: alimentacionStatusSchema,
  refrigerio2: alimentacionStatusSchema,
  auxilioTransporte: alimentacionStatusSchema,
});

export const alimentacionListResponseSchema = z.object({
  registros: z.array(alimentacionListItemSchema),
});

export const alimentacionTenantOptionsResponseSchema = z.object({
  tenants: z.array(alimentacionTenantOptionSchema),
});

export const alimentacionAdultoOptionsResponseSchema = z.object({
  adultosMayores: z.array(alimentacionAdultoOptionSchema),
});

export const createAlimentacionBatchResponseSchema = z.object({
  createdCount: z.number().int().min(1),
});

export const alimentacionLookupByAdultoMayorResponseSchema = z.object({
  adultoMayor: alimentacionAdultoOptionSchema,
  existingRecordId: z.uuid().nullable(),
});

export type AlimentacionStatus = z.infer<typeof alimentacionStatusSchema>;
export type AlimentacionOrganizer = z.infer<typeof alimentacionOrganizerSchema>;
export type AlimentacionListQuery = z.infer<typeof alimentacionListQuerySchema>;
export type AlimentacionAdultoOptionsQuery = z.infer<typeof alimentacionAdultoOptionsQuerySchema>;
export type AlimentacionLookupByAdultoMayorQuery = z.infer<
  typeof alimentacionLookupByAdultoMayorQuerySchema
>;
export type AlimentacionFormatoEntregaExportQuery = z.infer<
  typeof alimentacionFormatoEntregaExportQuerySchema
>;
export type AlimentacionImportedFormatoVersion = z.infer<
  typeof alimentacionImportedFormatoVersionSchema
>;
export type AlimentacionImportedFormatoVersionsResponse = z.infer<
  typeof alimentacionImportedFormatoVersionsResponseSchema
>;
export type AlimentacionImportedFormatoUploadResponse = z.infer<
  typeof alimentacionImportedFormatoUploadResponseSchema
>;
export type AlimentacionTenantOption = z.infer<typeof alimentacionTenantOptionSchema>;
export type AlimentacionAdultoOption = z.infer<typeof alimentacionAdultoOptionSchema>;
export type AlimentacionListItem = z.infer<typeof alimentacionListItemSchema>;
export type AlimentacionDetail = z.infer<typeof alimentacionDetailSchema>;
export type CreateAlimentacionBatchRequest = z.infer<typeof createAlimentacionBatchRequestSchema>;
export type UpdateAlimentacionRequest = z.infer<typeof updateAlimentacionRequestSchema>;
export type AlimentacionListResponse = z.infer<typeof alimentacionListResponseSchema>;
export type AlimentacionTenantOptionsResponse = z.infer<
  typeof alimentacionTenantOptionsResponseSchema
>;
export type AlimentacionAdultoOptionsResponse = z.infer<
  typeof alimentacionAdultoOptionsResponseSchema
>;
export type CreateAlimentacionBatchResponse = z.infer<typeof createAlimentacionBatchResponseSchema>;
export type AlimentacionLookupByAdultoMayorResponse = z.infer<
  typeof alimentacionLookupByAdultoMayorResponseSchema
>;
