import { z } from "zod";

export const epsOptionSchema = z.object({
  id: z.uuid(),
  code: z.string().min(1).max(40),
  name: z.string().min(1).max(160),
});

export const epsListResponseSchema = z.object({
  eps: z.array(epsOptionSchema),
});

export type EpsOption = z.infer<typeof epsOptionSchema>;
export type EpsListResponse = z.infer<typeof epsListResponseSchema>;
