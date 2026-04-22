import { z } from "zod";

export const tenantDocumentTypeSchema = z.enum(["nit", "cc", "ce"]);
export const tenantStatusFilterSchema = z.enum(["all", "active", "inactive"]);

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);

const nullableTextSchema = (maxLength: number) =>
  z
    .union([z.string(), z.null()])
    .transform((value) => {
      if (value === null) {
        return null;
      }

      const trimmedValue = value.trim();

      return trimmedValue === "" ? null : trimmedValue;
    })
    .pipe(z.string().max(maxLength).nullable());

const nullableEmailSchema = z
  .union([z.string(), z.null()])
  .transform((value) => {
    if (value === null) {
      return null;
    }

    const trimmedValue = value.trim().toLowerCase();

    return trimmedValue === "" ? null : trimmedValue;
  })
  .pipe(z.email().max(320).nullable());

const ownerPasswordSchema = z.string().trim().min(8).max(128);
const optionalOwnerPasswordSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? undefined : trimmedValue;
  })
  .pipe(ownerPasswordSchema.optional());

export const backofficeTenantSchema = z.object({
  id: z.uuid(),
  documentType: tenantDocumentTypeSchema,
  documentNumber: z.string().nullable(),
  name: z.string().min(1),
  email: z.email().nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  city: z.string().nullable(),
  department: z.string().nullable(),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const backofficeTenantOwnerSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  email: z.email(),
  fullName: z.string().min(1),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const backofficeTenantListItemSchema = z.object({
  tenant: backofficeTenantSchema,
  owner: backofficeTenantOwnerSchema.nullable(),
});

export const backofficeTenantDetailSchema = z.object({
  tenant: backofficeTenantSchema,
  owner: backofficeTenantOwnerSchema,
});

export const backofficeTenantCommandSchema = z.object({
  documentType: tenantDocumentTypeSchema,
  documentNumber: nullableTextSchema(80),
  name: requiredTextSchema(160),
  email: nullableEmailSchema,
  phone: nullableTextSchema(40),
  address: nullableTextSchema(220),
  city: nullableTextSchema(100),
  department: nullableTextSchema(100),
  isActive: z.boolean(),
});

export const backofficeTenantOwnerCreateCommandSchema = z.object({
  fullName: requiredTextSchema(180),
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  password: ownerPasswordSchema,
  isActive: z.boolean(),
});

export const backofficeTenantOwnerUpdateCommandSchema = z.object({
  fullName: requiredTextSchema(180),
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  password: optionalOwnerPasswordSchema,
  isActive: z.boolean(),
});

export const createBackofficeTenantRequestSchema = z.object({
  tenant: backofficeTenantCommandSchema,
  owner: backofficeTenantOwnerCreateCommandSchema,
});

export const updateBackofficeTenantRequestSchema = z.object({
  tenant: backofficeTenantCommandSchema,
  owner: backofficeTenantOwnerUpdateCommandSchema,
});

export const backofficeTenantListQuerySchema = z.object({
  search: nullableTextSchema(120).optional().default(null),
  status: tenantStatusFilterSchema.optional().default("all"),
});

export const backofficeTenantListResponseSchema = z.object({
  tenants: z.array(backofficeTenantListItemSchema),
});

export const backofficeTenantDetailResponseSchema = backofficeTenantDetailSchema;

export type TenantDocumentType = z.infer<typeof tenantDocumentTypeSchema>;
export type TenantStatusFilter = z.infer<typeof tenantStatusFilterSchema>;
export type BackofficeTenant = z.infer<typeof backofficeTenantSchema>;
export type BackofficeTenantOwner = z.infer<typeof backofficeTenantOwnerSchema>;
export type BackofficeTenantListItem = z.infer<typeof backofficeTenantListItemSchema>;
export type BackofficeTenantDetail = z.infer<typeof backofficeTenantDetailSchema>;
export type CreateBackofficeTenantRequest = z.infer<typeof createBackofficeTenantRequestSchema>;
export type UpdateBackofficeTenantRequest = z.infer<typeof updateBackofficeTenantRequestSchema>;
export type BackofficeTenantListQuery = z.infer<typeof backofficeTenantListQuerySchema>;
export type BackofficeTenantListResponse = z.infer<typeof backofficeTenantListResponseSchema>;
export type BackofficeTenantDetailResponse = z.infer<
  typeof backofficeTenantDetailResponseSchema
>;
