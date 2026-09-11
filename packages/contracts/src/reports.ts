import type { UserRole } from "./auth.js";
import { z } from "zod";

export const reportAccessRoleValues = [
  "super_admin",
  "admin",
  "director",
] as const satisfies readonly UserRole[];

export const reportTypeValues = [
  "ACTAS_SESIONES_GRUPALES",
  "FORMATOS_ENTREGA_ALIMENTACION",
] as const;

export const reportStatusValues = [
  "pending",
  "processing",
  "ready",
  "empty",
  "failed",
  "cancelled",
  "expired",
] as const;

export const reportTypeSchema = z.enum(reportTypeValues);
export const reportStatusSchema = z.enum(reportStatusValues);
export const reportPeriodSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);
export const nullableReportTenantIdSchema = z.uuid().nullable();

export const reportAvailabilityQuerySchema = z.object({
  type: reportTypeSchema,
  period: reportPeriodSchema,
  tenantId: nullableReportTenantIdSchema.optional().default(null),
});

export const createReportRequestSchema = z.object({
  type: reportTypeSchema,
  period: reportPeriodSchema,
  tenantId: nullableReportTenantIdSchema.optional().default(null),
});

export const reportListQuerySchema = z.object({
  type: reportTypeSchema.optional(),
  period: reportPeriodSchema.optional(),
  tenantId: nullableReportTenantIdSchema.optional().default(null),
});

export const reportAvailabilityResponseSchema = z.object({
  type: reportTypeSchema,
  period: reportPeriodSchema,
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  availableDocuments: z.number().int().min(0),
  hasDocuments: z.boolean(),
  generatedDocuments: z.number().int().min(0).optional(),
  importedDocuments: z.number().int().min(0).optional(),
});

export const reportJobSchema = z.object({
  id: z.uuid(),
  type: reportTypeSchema,
  status: reportStatusSchema,
  period: reportPeriodSchema,
  tenantId: z.uuid(),
  tenantName: z.string().min(1),
  requestedByUserId: z.uuid(),
  totalDocuments: z.number().int().min(0).nullable(),
  processedDocuments: z.number().int().min(0),
  failedDocuments: z.number().int().min(0),
  downloadFilename: z.string().min(1).nullable(),
  errorCode: z.string().min(1).nullable(),
  message: z.string().min(1).nullable(),
  downloadAvailable: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const createReportResponseSchema = z.object({
  report: reportJobSchema,
});

export const reportStatusResponseSchema = z.object({
  report: reportJobSchema,
});

export const reportListResponseSchema = z.object({
  reports: z.array(reportJobSchema),
});

export const cancelReportResponseSchema = z.object({
  report: reportJobSchema,
});

export type ReportAccessRole = (typeof reportAccessRoleValues)[number];
export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportAvailabilityQuery = z.infer<typeof reportAvailabilityQuerySchema>;
export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type ReportAvailabilityResponse = z.infer<typeof reportAvailabilityResponseSchema>;
export type ReportJob = z.infer<typeof reportJobSchema>;
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
export type ReportStatusResponse = z.infer<typeof reportStatusResponseSchema>;
export type ReportListResponse = z.infer<typeof reportListResponseSchema>;
export type CancelReportResponse = z.infer<typeof cancelReportResponseSchema>;
