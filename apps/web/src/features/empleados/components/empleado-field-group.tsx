import { type ReactNode } from "react";

type EmpleadoFieldGroupProps = {
  children: ReactNode;
  className?: string;
  error: string | undefined;
  label: string;
};

export function EmpleadoFieldGroup({
  children,
  className = "",
  error,
  label,
}: EmpleadoFieldGroupProps) {
  return (
    <label className={`empleado-form-field ${className}`.trim()}>
      <span>{label}</span>
      {children}
      {error === undefined ? null : <span className="field-error">{error}</span>}
    </label>
  );
}
