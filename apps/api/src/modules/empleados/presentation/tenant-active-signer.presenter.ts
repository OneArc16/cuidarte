import { type TenantActiveSignerRecord } from "../domain/empleado.types";

export function toTenantActiveSignerResponse(activeSigner: TenantActiveSignerRecord | null): {
  tenantId: string;
  employeeId: string;
  signatureVersionId: string;
  activatedByUserId: string;
  activatedAt: string;
  updatedAt: string;
} | null {
  if (activeSigner === null) {
    return null;
  }

  return {
    tenantId: activeSigner.tenantId,
    employeeId: activeSigner.employeeId,
    signatureVersionId: activeSigner.signatureVersionId,
    activatedByUserId: activeSigner.activatedByUserId,
    activatedAt: activeSigner.activatedAt.toISOString(),
    updatedAt: activeSigner.updatedAt.toISOString(),
  };
}
