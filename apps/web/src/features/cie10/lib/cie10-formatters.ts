import { ApiError } from "@/shared/api/api-error";

export function formatCie10OptionLabel(code: string, title: string): string {
  return `${code} - ${title}`;
}

export function resolveCie10ApiError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  return "No fue posible buscar diagnosticos CIE-10.";
}
