import { ApiError } from "@/shared/api/api-error";

const LOCKED_ACCOUNT_MESSAGE_PREFIX = "Cuenta bloqueada temporalmente";

export function resolveLoginError(error: unknown): string | null {
  if (error === null) {
    return null;
  }

  if (error instanceof ApiError && error.status === 401) {
    // Only the temporary lock message is shown as-is; any other rejection stays generic.
    return error.message.startsWith(LOCKED_ACCOUNT_MESSAGE_PREFIX)
      ? error.message
      : "Correo o contrasena incorrectos.";
  }

  if (error instanceof Error) {
    return "No fue posible iniciar sesion. Intenta nuevamente.";
  }

  return null;
}
