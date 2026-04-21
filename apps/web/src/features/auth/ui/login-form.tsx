import { loginRequestSchema, type LoginRequest } from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { ApiError } from "../../../shared/api/api-error";
import { useLoginMutation } from "../model/auth-queries";

const DEFAULT_VALUES: LoginRequest = {
  email: "",
  password: "",
};
const REMEMBERED_EMAIL_STORAGE_KEY = "cuidarte.login.email";

type LoginFormProps = {
  onAuthenticated?: () => void;
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const loginMutation = useLoginMutation();
  const [rememberedEmail] = useState(readRememberedEmail);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [isRememberLoginEnabled, setIsRememberLoginEnabled] = useState(rememberedEmail !== "");
  const rememberMeId = useId();
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginRequestSchema),
    defaultValues: { ...DEFAULT_VALUES, email: rememberedEmail },
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
              if (isRememberLoginEnabled) {
                rememberEmail(values.email);
              }

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
        <div className="password-field">
          <input
            id="password"
            autoComplete="current-password"
            type={isPasswordVisible ? "text" : "password"}
            aria-invalid={form.formState.errors.password === undefined ? "false" : "true"}
            aria-describedby={
              form.formState.errors.password === undefined ? undefined : "password-error"
            }
            {...form.register("password")}
          />
          <button
            className="password-visibility"
            type="button"
            aria-label={isPasswordVisible ? "Ocultar contrasena" : "Mostrar contrasena"}
            aria-pressed={isPasswordVisible}
            onClick={() => {
              setIsPasswordVisible((currentValue) => !currentValue);
            }}
          >
            {isPasswordVisible ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        {form.formState.errors.password !== undefined ? (
          <p className="field-error" id="password-error">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      <label className="remember-option" htmlFor={rememberMeId}>
        <input
          id={rememberMeId}
          checked={isRememberLoginEnabled}
          name="remember-password"
          type="checkbox"
          onChange={(event) => {
            const isChecked = event.currentTarget.checked;

            setIsRememberLoginEnabled(isChecked);

            if (!isChecked) {
              forgetRememberedEmail();
            }
          }}
        />
        <span>Recordar contrasena</span>
      </label>

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

function EyeIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M2.75 12s3.25-6.25 9.25-6.25S21.25 12 21.25 12 18 18.25 12 18.25 2.75 12 2.75 12Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.75A2.75 2.75 0 1 0 12 9.25a2.75 2.75 0 0 0 0 5.5Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
      <path
        d="M3.25 3.25 20.75 20.75"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
      <path
        d="M9.88 5.98A9.05 9.05 0 0 1 12 5.75c6 0 9.25 6.25 9.25 6.25a17.24 17.24 0 0 1-2.5 3.32M6.56 7.54C4.08 9.18 2.75 12 2.75 12S6 18.25 12 18.25c1.5 0 2.83-.39 4-1.01"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M10.32 10.32a2.75 2.75 0 0 0 3.36 3.36"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function readRememberedEmail(): string {
  if (typeof window === "undefined") {
    return "";
  }

  try {
    return window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function rememberEmail(email: string) {
  const normalizedEmail = email.trim();

  if (normalizedEmail === "") {
    forgetRememberedEmail();
    return;
  }

  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, normalizedEmail);
  } catch {
    return;
  }
}

function forgetRememberedEmail() {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
  } catch {
    return;
  }
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
