import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";

const viewRoles = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "auditor",
  "director",
  "trabajadora_social",
]);
const createRoles = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "director",
  "trabajadora_social",
]);

export const canOpenTrabajoSocial = (user: Pick<AuthUser, "role" | "permissions">) =>
  user.permissions === undefined
    ? viewRoles.has(user.role)
    : hasUserPermission(user, "trabajo_social.view");
export const canCreateTrabajoSocial = (user: Pick<AuthUser, "role" | "permissions">) =>
  user.permissions === undefined
    ? createRoles.has(user.role)
    : hasUserPermission(user, "trabajo_social.create");
