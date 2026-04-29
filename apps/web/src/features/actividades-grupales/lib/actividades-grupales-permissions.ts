import { type AuthUser } from "@cuidarte/contracts";

export function canManageActividadesGrupales(user: Pick<AuthUser, "role">): boolean {
  return user.role !== "auditor";
}
