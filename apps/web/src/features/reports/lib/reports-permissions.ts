import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

export function canOpenReports(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" || user.role === "admin" || user.role === "auditor" || user.role === "director"
    : hasUserPermission(user, "reportes.view");
}
