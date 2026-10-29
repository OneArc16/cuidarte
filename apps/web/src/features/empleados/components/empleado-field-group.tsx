import { type ReactNode } from "react";

type EmpleadoFieldGroupProps = {
  children: ReactNode;
  className?: string;
  error: string | undefined;
  hint?: string;
  id: string;
  label: string;
};

export function EmpleadoFieldGroup({
  children,
  className = "",
  error,
  hint,
  id,
  label,
}: EmpleadoFieldGroupProps) {
  return (
    <div className={`empleado-form-field ${className}`.trim()}>
      <label htmlFor={id}>{label}</label>
      {children}
      {hint === undefined ? null : <span className="field-hint">{hint}</span>}
      {error === undefined ? null : (
        <span className="field-error" aria-live="polite">
          {error}
        </span>
      )}
    </div>
  );
}
