import { type ReactNode } from "react";

type AdultoMayorFieldGroupProps = {
  children: ReactNode;
  error: string | undefined;
  label: string;
};

export function AdultoMayorFieldGroup({ children, error, label }: AdultoMayorFieldGroupProps) {
  return (
    <label className="adulto-form-field">
      <span>{label}</span>
      {children}
      {error === undefined ? null : <span className="field-error">{error}</span>}
    </label>
  );
}
