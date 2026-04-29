import { type AuthUser } from "@cuidarte/contracts";

export function canManageAdultosMayores(user: Pick<AuthUser, "role">): boolean {
  return user.role !== "auditor";
}
