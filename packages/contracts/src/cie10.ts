import { z } from "zod";

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

export const cie10OptionSchema = z.object({
  code: z.string().min(3).max(10),
  title: z.string().min(1).max(255),
});

export const cie10SearchQuerySchema = z.object({
  search: nullableSearchSchema.optional().default(null),
});

export const cie10OptionsResponseSchema = z.object({
  options: z.array(cie10OptionSchema),
});

export type Cie10Option = z.infer<typeof cie10OptionSchema>;
export type Cie10SearchQuery = z.infer<typeof cie10SearchQuerySchema>;
export type Cie10OptionsResponse = z.infer<typeof cie10OptionsResponseSchema>;
