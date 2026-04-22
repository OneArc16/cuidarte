import { type ReactNode } from "react";

type FieldGroupProps = {
  children: ReactNode;
  error: string | undefined;
  label: string;
};

export function FieldGroup({ children, error, label }: FieldGroupProps) {
  return (
    <label className="field-group">
      <span>{label}</span>
      {children}
      {error === undefined ? null : <span className="field-error">{error}</span>}
    </label>
  );
}
