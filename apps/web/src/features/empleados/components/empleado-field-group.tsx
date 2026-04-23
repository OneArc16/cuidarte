import { type ReactNode } from "react";

type EmpleadoFieldGroupProps = {
  children: ReactNode;
  error: string | undefined;
  label: string;
};

export function EmpleadoFieldGroup({ children, error, label }: EmpleadoFieldGroupProps) {
  return (
    <label className="empleado-form-field">
      <span>{label}</span>
      {children}
      {error === undefined ? null : <span className="field-error">{error}</span>}
    </label>
  );
}
