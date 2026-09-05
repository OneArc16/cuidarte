import { type TenantActiveSigner } from "@cuidarte/contracts";

export type TenantActiveSignerAction = "activate" | "deactivate" | "unavailable" | "update";

export function resolveTenantActiveSignerAction({
  activeSigner,
  employeeId,
  latestSignatureId,
}: {
  activeSigner: TenantActiveSigner | null;
  employeeId: string;
  latestSignatureId: string | null;
}): TenantActiveSignerAction {
  if (activeSigner?.employeeId === employeeId) {
    if (latestSignatureId !== null && activeSigner.signatureVersionId !== latestSignatureId) {
      return "update";
    }

    return "deactivate";
  }

  return latestSignatureId === null ? "unavailable" : "activate";
}
