import { type ReactNode } from "react";

type ActividadGrupalFieldGroupProps = {
  children: ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  label: string;
};

export function ActividadGrupalFieldGroup({
  children,
  error,
  hint,
  label,
}: ActividadGrupalFieldGroupProps) {
  return (
    <label className="actividad-form-field">
      <span>{label}</span>
      {children}
      {hint !== undefined && error === undefined ? <small>{hint}</small> : null}
      {error !== undefined ? (
        <span className="field-error" role="alert">
          {error}
        </span>
      ) : null}
    </label>
  );
}
