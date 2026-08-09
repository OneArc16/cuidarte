import { z } from "zod";

export const departmentSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(120),
});

export const municipalitySchema = z.object({
  id: z.uuid(),
  departmentId: z.uuid(),
  name: z.string().min(1).max(120),
});

export const departmentsResponseSchema = z.object({
  departments: z.array(departmentSchema),
});

export const municipalitiesResponseSchema = z.object({
  municipalities: z.array(municipalitySchema),
});

export type Department = z.infer<typeof departmentSchema>;
export type Municipality = z.infer<typeof municipalitySchema>;
export type DepartmentsResponse = z.infer<typeof departmentsResponseSchema>;
export type MunicipalitiesResponse = z.infer<typeof municipalitiesResponseSchema>;
