import { z } from "zod";

import { userRoleSchema } from "./auth.js";

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

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

const passwordSchema = z.string().trim().min(8).max(128);

const optionalPasswordSchema = z
  .union([z.string(), z.undefined()])
  .transform((value) => {
    if (value === undefined) {
      return undefined;
    }

    const trimmedValue = value.trim();

    return trimmedValue === "" ? undefined : trimmedValue;
  })
  .pipe(passwordSchema.optional());

export const empleadoListQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
});

export const empleadoTenantOptionSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1),
});

export const empleadoListItemSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid().nullable(),
  tenantName: z.string().min(1).nullable(),
  documentNumber: z.string().max(80).nullable(),
  fullName: z.string().min(1).max(180),
  email: z.email().max(320),
  phone: z.string().max(40).nullable(),
  role: userRoleSchema,
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const empleadoSignatureSchema = z.object({
  id: z.uuid(),
  originalName: z.string().min(1).max(260),
  mimeType: z.string().min(1).max(160),
  sizeBytes: z.number().int().positive(),
  createdAt: z.string().min(1),
});

export const empleadoDirectorSignatureAssignmentSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid(),
  employeeId: z.uuid(),
  signatureVersionId: z.uuid(),
  effectiveFrom: dateSchema,
  effectiveTo: dateSchema.nullable(),
});

export const empleadoDetailSchema = empleadoListItemSchema.extend({
  firstName: z.string().min(1).max(80),
  middleName: z.string().max(80).nullable(),
  firstSurname: z.string().min(1).max(80),
  secondSurname: z.string().max(80).nullable(),
  latestSignature: empleadoSignatureSchema.nullable().optional().default(null),
  currentDirectorSignatureAssignment: empleadoDirectorSignatureAssignmentSchema
    .nullable()
    .optional()
    .default(null),
});

export const empleadoCommandSchema = z.object({
  firstName: requiredTextSchema(80),
  middleName: nullableTextSchema(80),
  firstSurname: requiredTextSchema(80),
  secondSurname: nullableTextSchema(80),
  email: z.email().max(320).transform((value) => value.toLowerCase()),
  documentNumber: requiredTextSchema(80),
  phone: nullableTextSchema(40),
  role: userRoleSchema,
  isActive: z.boolean(),
});

export const createEmpleadoRequestSchema = empleadoCommandSchema.extend({
  tenantId: z.uuid().nullable().optional().default(null),
  password: passwordSchema,
});

export const updateEmpleadoRequestSchema = empleadoCommandSchema.extend({
  password: optionalPasswordSchema,
});

export const assignEmpleadoDirectorSignatureRequestSchema = z.object({
  effectiveFrom: dateSchema,
  signatureVersionId: z.uuid().nullable().optional().default(null),
});

export const empleadoListResponseSchema = z.object({
  empleados: z.array(empleadoListItemSchema),
});

export const empleadoDetailResponseSchema = empleadoDetailSchema;

export const empleadoTenantOptionsResponseSchema = z.object({
  tenants: z.array(empleadoTenantOptionSchema),
});

export type EmpleadoListQuery = z.infer<typeof empleadoListQuerySchema>;
export type EmpleadoTenantOption = z.infer<typeof empleadoTenantOptionSchema>;
export type EmpleadoListItem = z.infer<typeof empleadoListItemSchema>;
export type EmpleadoSignature = z.infer<typeof empleadoSignatureSchema>;
export type EmpleadoDirectorSignatureAssignment = z.infer<
  typeof empleadoDirectorSignatureAssignmentSchema
>;
export type EmpleadoDetail = z.infer<typeof empleadoDetailSchema>;
export type CreateEmpleadoRequest = z.infer<typeof createEmpleadoRequestSchema>;
export type UpdateEmpleadoRequest = z.infer<typeof updateEmpleadoRequestSchema>;
export type AssignEmpleadoDirectorSignatureRequest = z.infer<
  typeof assignEmpleadoDirectorSignatureRequestSchema
>;
export type EmpleadoListResponse = z.infer<typeof empleadoListResponseSchema>;
export type EmpleadoDetailResponse = z.infer<typeof empleadoDetailResponseSchema>;
export type EmpleadoTenantOptionsResponse = z.infer<
  typeof empleadoTenantOptionsResponseSchema
>;
