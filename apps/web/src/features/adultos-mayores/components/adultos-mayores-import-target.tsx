import { type AdultoMayorTenantOption, type AuthUser } from "@cuidarte/contracts";

type AdultosMayoresImportTargetProps = {
  tenantOptions: AdultoMayorTenantOption[];
  tenantId: string | null;
  user: AuthUser;
  disabled: boolean;
  onTenantChange: (tenantId: string) => void;
};

export function AdultosMayoresImportTarget({
  disabled,
  onTenantChange,
  tenantId,
  tenantOptions,
  user,
}: AdultosMayoresImportTargetProps) {
  const tenantName = tenantOptions.find((tenant) => tenant.id === user.tenantId)?.name ?? "Centro asociado";

  if (user.role !== "super_admin") {
    return (
      <div className="import-target import-target--readonly">
        <span className="import-target__label">Centro de destino</span>
        <strong>{tenantName}</strong>
        {user.tenantId === null ? <p className="form-error">Tu usuario no tiene un centro asociado.</p> : null}
      </div>
    );
  }

  return (
    <label className="import-target">
      <span className="import-target__label">Centro de destino</span>
      <select
        value={tenantId ?? ""}
        disabled={disabled}
        onChange={(event) => onTenantChange(event.target.value)}
      >
        <option value="">Selecciona un centro</option>
        {tenantOptions.map((tenant) => (
          <option key={tenant.id} value={tenant.id}>
            {tenant.name}
          </option>
        ))}
      </select>
    </label>
  );
}
