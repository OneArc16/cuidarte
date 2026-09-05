import { type AuthUser, homeDashboardAccessRoleValues } from "@cuidarte/contracts";

const HOME_DASHBOARD_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  homeDashboardAccessRoleValues,
);

export function canViewHomeDashboard(user: Pick<AuthUser, "role">): boolean {
  return HOME_DASHBOARD_ACCESS_ROLES.has(user.role);
}
