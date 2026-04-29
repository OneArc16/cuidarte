import { type ReactNode } from "react";

type AtencionFieldGroupProps = {
  children: ReactNode;
  error?: string | undefined;
  label: string;
};

export function AtencionFieldGroup({ children, error, label }: AtencionFieldGroupProps) {
  return (
    <label className="adulto-form-field">
      <span>{label}</span>
      {children}
      {error === undefined ? null : <span className="field-error">{error}</span>}
    </label>
  );
}
