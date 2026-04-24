import { type ReactNode } from "react";

type AlimentacionFieldGroupProps = {
  children: ReactNode;
  error?: string | undefined;
  hint?: string | undefined;
  label: string;
};

export function AlimentacionFieldGroup({
  children,
  error,
  hint,
  label,
}: AlimentacionFieldGroupProps) {
  return (
    <label className="alimentacion-form-field">
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
