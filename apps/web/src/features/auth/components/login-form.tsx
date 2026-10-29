import { loginRequestSchema, type LoginRequest } from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, CircleAlert, Eye, EyeOff, LockKeyhole, Mail } from "lucide-react";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";

import { useLoginMutation } from "../model/auth-queries";
import { resolveLoginError } from "../lib/login-error";
import { forgetRememberedEmail, readRememberedEmail, rememberEmail } from "../lib/remembered-email";

const DEFAULT_VALUES: LoginRequest = {
  email: "",
  password: "",
};

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
        <div
          className={
            form.formState.errors.email === undefined
              ? "auth-input"
              : "auth-input auth-input--invalid"
          }
        >
          <Mail aria-hidden="true" />
          <input
            id="email"
            autoComplete="email"
            inputMode="email"
            type="email"
            placeholder="nombre@correo.com"
            aria-invalid={form.formState.errors.email === undefined ? "false" : "true"}
            aria-describedby={form.formState.errors.email === undefined ? undefined : "email-error"}
            {...form.register("email")}
          />
        </div>
        {form.formState.errors.email !== undefined ? (
          <p className="field-error" id="email-error">
            {form.formState.errors.email.message}
          </p>
        ) : null}
      </div>

      <div className="field-group">
        <label htmlFor="password">Contrasena</label>
        <div
          className={
            form.formState.errors.password === undefined
              ? "auth-input password-field"
              : "auth-input auth-input--invalid password-field"
          }
        >
          <LockKeyhole aria-hidden="true" />
          <input
            id="password"
            autoComplete="current-password"
            type={isPasswordVisible ? "text" : "password"}
            placeholder="Tu contrasena"
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
            {isPasswordVisible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        </div>
        {form.formState.errors.password !== undefined ? (
          <p className="field-error" id="password-error">
            {form.formState.errors.password.message}
          </p>
        ) : null}
      </div>

      {rootError !== null ? (
        <p className="form-error" role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{rootError}</span>
        </p>
      ) : null}

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

      <button className="primary-action" disabled={loginMutation.isPending} type="submit">
        <span>{loginMutation.isPending ? "Ingresando..." : "Iniciar sesion"}</span>
        {loginMutation.isPending ? null : <ArrowRight aria-hidden="true" />}
      </button>
      <p className="login-form__help">¿Problemas para ingresar? Habla con tu administrador.</p>
    </form>
  );
}
