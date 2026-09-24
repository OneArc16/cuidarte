import { hasUserPermission, type AuthUser, reportAccessRoleValues } from "@cuidarte/contracts";

export function canOpenReports(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" || user.role === "admin" || user.role === "director"
    : hasUserPermission(user, "reportes.view");
}
