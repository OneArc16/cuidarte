import { z } from "zod";

export const userRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
  "enfermeria",
  "fisioterapeuta",
  "medico",
  "nutricionista",
  "psicologo",
  "recreacionista",
  "trabajadora_social",
] as const;

export const userRoleSchema = z.enum(userRoleValues);

export const authUserSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid().nullable(),
  email: z.email(),
  fullName: z.string().min(1),
  role: userRoleSchema,
  passwordSetByAdmin: z.boolean(),
});

export const loginRequestSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase()),
  password: z.string().min(1),
});

export const authSessionSchema = z.object({
  user: authUserSchema,
});

export const meResponseSchema = z.object({
  user: authUserSchema.nullable(),
});

export const logoutResponseSchema = z.object({
  success: z.literal(true),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginRequest = z.input<typeof loginRequestSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
