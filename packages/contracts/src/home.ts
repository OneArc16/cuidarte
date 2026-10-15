import type { UserRole } from "./auth.js";
import { z } from "zod";

export const homeDashboardAccessRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
] as const satisfies readonly UserRole[];

export const homeDashboardShortcutModuleIdValues = [
  "adultos-mayores",
  "importacion-adultos-mayores",
  "sesiones-grupales",
  "registro-alimentacion",
  "gestion-empleados",
  "backoffice",
] as const;

export const homeDashboardIndicatorIdValues = [
  "adultos_registrados",
  "atenciones_enfermeria",
  "atenciones_medico",
  "salud_preventiva",
  "sesiones_psicosocial",
  "raciones_entregadas",
  "encuentro_intergeneracional",
  "nutricion",
  "actividades_manualidad",
  "fisioterapia",
  "actividad_campo",
  "actividades_recreacion",
] as const;

export const homeDashboardShortcutModuleIdSchema = z.enum(homeDashboardShortcutModuleIdValues);
export const homeDashboardIndicatorIdSchema = z.enum(homeDashboardIndicatorIdValues);

export const homeDashboardShortcutSchema = z.object({
  moduleId: homeDashboardShortcutModuleIdSchema,
  total: z.number().int().min(0),
});

export const homeDashboardIndicatorSchema = z.object({
  id: homeDashboardIndicatorIdSchema,
  total: z.number().int().min(0),
});

export const homeDashboardActivityIndicatorSchema = z.object({
  activityTypeId: z.uuid(),
  label: z.string().min(1).max(120),
  isActive: z.boolean(),
  total: z.number().int().min(0),
});

export const homeDashboardFoodSummarySchema = z.object({
  deliveredTotal: z.number().int().min(0),
  auxilioTransporteTotal: z.number().int().min(0),
});

export const homeDashboardAnalyticsSchema = z.object({
  sexDistribution: z.object({
    male: z.number().int().min(0),
    female: z.number().int().min(0),
    other: z.number().int().min(0),
  }),
  activitiesByType: z.array(
    z.object({ label: z.string().min(1).max(120), total: z.number().int().min(0) }),
  ),
  monthlyDeliveries: z.array(
    z.object({
      month: z.string().regex(/^\d{4}-\d{2}$/),
      rationsDelivered: z.number().int().min(0),
      transportAllowancesDelivered: z.number().int().min(0),
    }),
  ),
});

export const homeDashboardResponseSchema = z.object({
  shortcuts: z.array(homeDashboardShortcutSchema),
  indicators: z.array(homeDashboardIndicatorSchema),
  activityIndicators: z.array(homeDashboardActivityIndicatorSchema).default([]),
  foodSummary: homeDashboardFoodSummarySchema.nullable().default(null),
  analytics: homeDashboardAnalyticsSchema.nullable().default(null),
});

export type HomeDashboardShortcutModuleId = z.infer<typeof homeDashboardShortcutModuleIdSchema>;
export type HomeDashboardIndicatorId = z.infer<typeof homeDashboardIndicatorIdSchema>;
export type HomeDashboardShortcut = z.infer<typeof homeDashboardShortcutSchema>;
export type HomeDashboardIndicator = z.infer<typeof homeDashboardIndicatorSchema>;
export type HomeDashboardActivityIndicator = z.infer<typeof homeDashboardActivityIndicatorSchema>;
export type HomeDashboardFoodSummary = z.infer<typeof homeDashboardFoodSummarySchema>;
export type HomeDashboardAnalytics = z.infer<typeof homeDashboardAnalyticsSchema>;
export type HomeDashboardResponse = z.infer<typeof homeDashboardResponseSchema>;
