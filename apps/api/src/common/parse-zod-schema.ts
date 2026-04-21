import { BadRequestException } from "@nestjs/common";
import { type ZodSchema } from "zod";

export function parseZodSchema<T>(schema: ZodSchema<T>, value: unknown): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new BadRequestException({
      message: "Datos invalidos.",
      issues: result.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  return result.data;
}
