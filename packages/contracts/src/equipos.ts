import { z } from "zod";

const requiredNameSchema = z.string().trim().min(1).max(120);

export const equipoOptionSchema = z.object({
  id: z.uuid(),
  name: requiredNameSchema,
  isVisible: z.boolean(),
});

export const equiposListResponseSchema = z.object({
  equipos: z.array(equipoOptionSchema),
});

export const createEquipoRequestSchema = z.object({
  name: requiredNameSchema,
});

export const updateEquipoRequestSchema = z
  .object({
    name: requiredNameSchema.optional(),
    isVisible: z.boolean().optional(),
  })
  .refine((command) => command.name !== undefined || command.isVisible !== undefined, {
    message: "Indica al menos un cambio para el equipo.",
  });

export type EquipoOption = z.infer<typeof equipoOptionSchema>;
export type EquiposListResponse = z.infer<typeof equiposListResponseSchema>;
export type CreateEquipoRequest = z.infer<typeof createEquipoRequestSchema>;
export type UpdateEquipoRequest = z.infer<typeof updateEquipoRequestSchema>;
