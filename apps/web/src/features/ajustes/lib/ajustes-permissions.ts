import { type AuthUser } from "@cuidarte/contracts";

export function canManageAjustes(user: Pick<AuthUser, "role">): boolean {
  return user.role === "admin" || user.role === "super_admin";
}
