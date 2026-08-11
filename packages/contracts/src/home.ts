import { z } from "zod";

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

export const homeDashboardResponseSchema = z.object({
  shortcuts: z.array(homeDashboardShortcutSchema),
  indicators: z.array(homeDashboardIndicatorSchema),
});

export type HomeDashboardShortcutModuleId = z.infer<
  typeof homeDashboardShortcutModuleIdSchema
>;
export type HomeDashboardIndicatorId = z.infer<typeof homeDashboardIndicatorIdSchema>;
export type HomeDashboardShortcut = z.infer<typeof homeDashboardShortcutSchema>;
export type HomeDashboardIndicator = z.infer<typeof homeDashboardIndicatorSchema>;
export type HomeDashboardResponse = z.infer<typeof homeDashboardResponseSchema>;
