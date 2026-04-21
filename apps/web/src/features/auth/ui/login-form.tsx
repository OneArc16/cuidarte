import { loginRequestSchema, type LoginRequest } from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { ApiError } from "../../../shared/api/api-error";
import { useLoginMutation } from "../model/auth-queries";

const DEFAULT_VALUES: LoginRequest = {
  email: "",
  password: "",
};

type LoginFormProps = {
  onAuthenticated?: () => void;
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const loginMutation = useLoginMutation();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: DEFAULT_VALUES,
    mode: "onBlur",
  });

  const rootError = resolveLoginError(loginMutation.error);

  return (
    <form
      className="login-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => {
          loginMutation.mutate(values, {
            onSuccess: () => {
              onAuthenticated?.();
            },
          });
        })(event);
      }}
    >
      <div className="field-group">
        <label htmlFor="email">Correo</label>
        <input
          id="email"
          autoComplete="email"
          inputMode="email"
          type="email"
          aria-invalid={form.formState.errors.email === undefined ? "false" : "true"}
          aria-describedby={form.formState.errors.email === undefined ? undefined : "email-error"}
          {...form.register("email")}
        />
        {form.formState.errors.email !== undefined ? (
          <p className="field-error" id="email-error">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="field-group">
        <label htmlFor="password">Contrasena</label>
        <input
          id="password"
          autoComplete="current-password"
          type="password"
          aria-invalid={form.formState.errors.password === undefined ? "false" : "true"}
          aria-describedby={
            form.formState.errors.password === undefined ? undefined : "password-error"
          }
          {...form.register("password")}
        />
        {form.formState.errors.password !== undefined ? (
          <p className="field-error" id="password-error">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      {rootError !== null ? (
        <p className="form-error" role="alert">
          {rootError}
        </p>
      ) : null}

      <button className="primary-action" disabled={loginMutation.isPending} type="submit">
        {loginMutation.isPending ? "Ingresando..." : "Iniciar sesion"}
      </button>
    </form>
  );
}

function resolveLoginError(error: unknown): string | null {
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
