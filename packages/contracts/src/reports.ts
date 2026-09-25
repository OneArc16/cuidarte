import type { UserRole } from "./auth.js";
import { actividadGrupalOrganizerSchema } from "./actividades-grupales.js";
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
export const reportPeriodSchema = z.union([
  z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/),
  z.literal("ALL"),
]);
export const nullableReportTenantIdSchema = z.uuid().nullable();

export const reportActivityFiltersSchema = z.object({
  search: z.string().trim().max(120).nullable().optional(),
  activityTypeId: z.uuid().nullable().optional(),
  organizer: actividadGrupalOrganizerSchema.nullable().optional(),
});

export const reportAvailabilityQuerySchema = z.object({
  type: reportTypeSchema,
  period: reportPeriodSchema,
  tenantId: nullableReportTenantIdSchema.optional().default(null),
});

export const createReportRequestSchema = z.object({
  type: reportTypeSchema,
  period: reportPeriodSchema,
  tenantId: nullableReportTenantIdSchema.optional().default(null),
  filters: reportActivityFiltersSchema.optional(),
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
  filterKey: z.string().max(240),
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

const reportDashboardDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(isValidCalendarDate, "La fecha no es valida.");

export const reportsDashboardQuerySchema = z
  .object({
    from: reportDashboardDateSchema,
    to: reportDashboardDateSchema,
  })
  .refine((value) => value.from <= value.to, {
    message: "La fecha inicial no puede ser posterior a la fecha final.",
    path: ["to"],
  })
  .refine((value) => differenceInCalendarDays(value.from, value.to) <= 366, {
    message: "El rango maximo permitido es de 366 dias.",
    path: ["to"],
  });

export const reportsDashboardSummarySchema = z.object({
  nursingAttendances: z.number().int().min(0),
  medicalAttendances: z.number().int().min(0),
  activities: z.number().int().min(0),
  transportAllowancesDelivered: z.number().int().min(0),
  snackOneDelivered: z.number().int().min(0),
  snackTwoDelivered: z.number().int().min(0),
  snacksDelivered: z.number().int().min(0),
  lunchesDelivered: z.number().int().min(0),
});

export const reportsDashboardDailyPointSchema = z.object({
  date: reportDashboardDateSchema,
  nursingAttendances: z.number().int().min(0),
  medicalAttendances: z.number().int().min(0),
  activities: z.number().int().min(0),
  transportAllowancesDelivered: z.number().int().min(0),
  snacksDelivered: z.number().int().min(0),
  lunchesDelivered: z.number().int().min(0),
});

export const reportsDashboardActivityTypeSchema = z.object({
  activityTypeId: z.uuid(),
  activityTypeName: z.string().min(1),
  count: z.number().int().min(0),
});

export const reportsDashboardResponseSchema = z.object({
  range: z.object({ from: reportDashboardDateSchema, to: reportDashboardDateSchema }),
  scope: z.object({
    tenantId: z.uuid().nullable(),
    tenantName: z.string().min(1).nullable(),
    isConsolidated: z.boolean(),
    municipality: z.string().min(1).nullable().optional(),
    department: z.string().min(1).nullable().optional(),
  }),
  summary: reportsDashboardSummarySchema,
  dailySeries: z.array(reportsDashboardDailyPointSchema),
  activitiesByType: z.array(reportsDashboardActivityTypeSchema),
});

export const reportAnalyticsExportFormatValues = ["xlsx", "pdf", "pptx"] as const;
export const reportAnalyticsExportStatusValues = [
  "pending",
  "processing",
  "ready",
  "failed",
  "cancelled",
  "expired",
] as const;
export const reportAnalyticsExportFormatSchema = z.enum(reportAnalyticsExportFormatValues);
export const reportAnalyticsExportStatusSchema = z.enum(reportAnalyticsExportStatusValues);
export const createReportsDashboardExportRequestSchema = reportsDashboardQuerySchema.extend({
  format: reportAnalyticsExportFormatSchema,
});
export const reportsDashboardExportSchema = z.object({
  id: z.uuid(),
  format: reportAnalyticsExportFormatSchema,
  status: reportAnalyticsExportStatusSchema,
  from: reportDashboardDateSchema,
  to: reportDashboardDateSchema,
  tenantId: z.uuid().nullable(),
  tenantName: z.string().min(1).nullable(),
  requestedByUserId: z.uuid(),
  progress: z.number().int().min(0).max(100),
  downloadFilename: z.string().min(1).nullable(),
  errorMessage: z.string().min(1).nullable(),
  downloadAvailable: z.boolean(),
  expiresAt: z.string().datetime().nullable(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});
export const reportsDashboardExportResponseSchema = z.object({
  export: reportsDashboardExportSchema,
});
export const reportsDashboardExportListResponseSchema = z.object({
  exports: z.array(reportsDashboardExportSchema),
});

export const cancelReportResponseSchema = z.object({
  report: reportJobSchema,
});

export type ReportAccessRole = (typeof reportAccessRoleValues)[number];
export type ReportType = z.infer<typeof reportTypeSchema>;
export type ReportStatus = z.infer<typeof reportStatusSchema>;
export type ReportAvailabilityQuery = z.infer<typeof reportAvailabilityQuerySchema>;
export type CreateReportRequest = z.infer<typeof createReportRequestSchema>;
export type ReportActivityFilters = z.infer<typeof reportActivityFiltersSchema>;
export type ReportListQuery = z.infer<typeof reportListQuerySchema>;
export type ReportAvailabilityResponse = z.infer<typeof reportAvailabilityResponseSchema>;
export type ReportJob = z.infer<typeof reportJobSchema>;
export type CreateReportResponse = z.infer<typeof createReportResponseSchema>;
export type ReportStatusResponse = z.infer<typeof reportStatusResponseSchema>;
export type ReportListResponse = z.infer<typeof reportListResponseSchema>;
export type CancelReportResponse = z.infer<typeof cancelReportResponseSchema>;
export type ReportsDashboardQuery = z.infer<typeof reportsDashboardQuerySchema>;
export type ReportsDashboardSummary = z.infer<typeof reportsDashboardSummarySchema>;
export type ReportsDashboardDailyPoint = z.infer<typeof reportsDashboardDailyPointSchema>;
export type ReportsDashboardActivityType = z.infer<typeof reportsDashboardActivityTypeSchema>;
export type ReportsDashboardResponse = z.infer<typeof reportsDashboardResponseSchema>;
export type ReportAnalyticsExportFormat = z.infer<typeof reportAnalyticsExportFormatSchema>;
export type ReportAnalyticsExportStatus = z.infer<typeof reportAnalyticsExportStatusSchema>;
export type CreateReportsDashboardExportRequest = z.infer<
  typeof createReportsDashboardExportRequestSchema
>;
export type ReportsDashboardExport = z.infer<typeof reportsDashboardExportSchema>;

export function buildReportFilterKey(
  type: ReportType,
  filters: ReportActivityFilters | null | undefined,
): string {
  if (type !== "ACTAS_SESIONES_GRUPALES") {
    return "";
  }

  return [
    filters?.search?.trim() ?? "",
    filters?.activityTypeId ?? "",
    filters?.organizer ?? "",
  ].join("\u001f");
}

function differenceInCalendarDays(from: string, to: string): number {
  const fromTime = Date.parse(`${from}T00:00:00Z`);
  const toTime = Date.parse(`${to}T00:00:00Z`);

  return Math.floor((toTime - fromTime) / (24 * 60 * 60 * 1000));
}

function isValidCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}
