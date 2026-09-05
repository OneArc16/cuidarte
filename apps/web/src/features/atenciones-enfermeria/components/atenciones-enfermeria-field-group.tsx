import { type ReactNode } from "react";

type AtencionesEnfermeriaFieldGroupProps = {
  children: ReactNode;
  error?: string | undefined;
  label: string;
};

export function AtencionesEnfermeriaFieldGroup({
  children,
  error,
  label,
}: AtencionesEnfermeriaFieldGroupProps) {
  return (
    <label className="atenciones-enfermeria-field-group">
      <span>{label}</span>
      {children}
      {error === undefined ? null : <span className="field-error">{error}</span>}
    </label>
  );
}
