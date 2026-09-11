import { type AuthUser, reportAccessRoleValues } from "@cuidarte/contracts";

export function canOpenReports(user: Pick<AuthUser, "role">): boolean {
  return reportAccessRoleValues.includes(user.role as (typeof reportAccessRoleValues)[number]);
}
