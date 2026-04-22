import { ApiError } from "@/shared/api/api-error";

export function resolveLoginError(error: unknown): string | null {
  if (error === null) {
    return null;
  }

  if (error instanceof ApiError && error.status === 401) {
    return "Correo o contrasena incorrectos.";
  }

  if (error instanceof Error) {
    return "No fue posible iniciar sesion. Intenta nuevamente.";
  }

  return null;
}
