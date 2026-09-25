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
  limit: z.enum(["suggestions", "all"]).optional().default("suggestions"),
  tenantId: nullableTenantIdSchema.optional().default(null),
});

export const alimentacionLookupByAdultoMayorQuerySchema = z.object({
  deliveryDate: dateSchema,
});

export const alimentacionFormatoEntregaExportQuerySchema = z.object({
  deliveryMonth: alimentacionDeliveryMonthSchema,
});

export const alimentacionBulkImportModeSchema = z.enum(["month", "all"]);
export const alimentacionBulkImportItemStatusSchema = z.enum([
  "ready",
  "warning",
  "error",
  "imported",
  "skipped",
]);
export const alimentacionBulkImportDecisionSchema = z.enum(["import", "skip"]);
export const alimentacionBulkImportReasonCodeSchema = z.enum([
  "INVALID_FILENAME",
  "INVALID_MONTH",
  "INVALID_PDF",
  "ADULTO_NOT_FOUND",
  "AMBIGUOUS_ADULTO",
  "DUPLICATE_IN_BATCH",
  "ALREADY_IMPORTED",
  "DUPLICATE_FILE",
  "BATCH_EXPIRED",
]);

export const alimentacionBulkImportValidateQuerySchema = z
  .object({
    mode: alimentacionBulkImportModeSchema,
    deliveryMonth: nullableMonthSchema.optional().default(null),
    tenantId: nullableTenantIdSchema.optional().default(null),
  })
  .superRefine((value, context) => {
    if (value.mode === "month" && value.deliveryMonth === null) {
      context.addIssue({
        code: "custom",
        path: ["deliveryMonth"],
        message: "El mes es obligatorio cuando la importacion es mensual.",
      });
    }
  });

const alimentacionBulkImportSummarySchema = z.object({
  total: z.number().int().min(0),
  ready: z.number().int().min(0),
  warnings: z.number().int().min(0),
  errors: z.number().int().min(0),
  imported: z.number().int().min(0).default(0),
  skipped: z.number().int().min(0).default(0),
});

export const alimentacionBulkImportItemSchema = z.object({
  itemId: z.uuid(),
  originalName: z.string().min(1).max(260),
  status: alimentacionBulkImportItemStatusSchema,
  reasonCode: alimentacionBulkImportReasonCodeSchema.nullable().default(null),
  reasonMessage: z.string().min(1).max(300).nullable().default(null),
  documentNumber: z.string().min(1).max(80).nullable().default(null),
  deliveryMonth: alimentacionDeliveryMonthSchema.nullable().default(null),
  adultoMayorId: z.uuid().nullable().default(null),
  adultoMayorFullName: z.string().min(1).max(360).nullable().default(null),
  existingVersion: z.number().int().positive().nullable().default(null),
  importedVersion: z.number().int().positive().nullable().default(null),
});

export const alimentacionBulkImportValidateResponseSchema = z.object({
  batchId: z.uuid(),
  expiresAt: z.string().min(1),
  summary: alimentacionBulkImportSummarySchema,
  items: z.array(alimentacionBulkImportItemSchema),
});

export const alimentacionBulkImportConfirmRequestSchema = z.object({
  batchId: z.uuid(),
  items: z
    .array(
      z.object({
        itemId: z.uuid(),
        decision: alimentacionBulkImportDecisionSchema,
      }),
    )
    .min(1),
});

export const alimentacionBulkImportConfirmResponseSchema = z.object({
  batchId: z.uuid(),
  summary: alimentacionBulkImportSummarySchema,
  items: z.array(alimentacionBulkImportItemSchema),
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
  alreadyRegistered: z.boolean().default(false),
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
  canDelete: z.boolean().default(false),
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

export const deleteAlimentacionResponseSchema = z.object({
  success: z.literal(true),
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
export type AlimentacionBulkImportMode = z.infer<typeof alimentacionBulkImportModeSchema>;
export type AlimentacionBulkImportItemStatus = z.infer<
  typeof alimentacionBulkImportItemStatusSchema
>;
export type AlimentacionBulkImportReasonCode = z.infer<
  typeof alimentacionBulkImportReasonCodeSchema
>;
export type AlimentacionBulkImportValidateQuery = z.infer<
  typeof alimentacionBulkImportValidateQuerySchema
>;
export type AlimentacionBulkImportItem = z.infer<typeof alimentacionBulkImportItemSchema>;
export type AlimentacionBulkImportValidateResponse = z.infer<
  typeof alimentacionBulkImportValidateResponseSchema
>;
export type AlimentacionBulkImportConfirmRequest = z.infer<
  typeof alimentacionBulkImportConfirmRequestSchema
>;
export type AlimentacionBulkImportConfirmResponse = z.infer<
  typeof alimentacionBulkImportConfirmResponseSchema
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
export type DeleteAlimentacionResponse = z.infer<typeof deleteAlimentacionResponseSchema>;
export type AlimentacionLookupByAdultoMayorResponse = z.infer<
  typeof alimentacionLookupByAdultoMayorResponseSchema
>;
