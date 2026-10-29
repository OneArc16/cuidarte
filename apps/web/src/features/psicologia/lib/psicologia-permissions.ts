import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";
const viewRoles = new Set<AuthUser["role"]>([
  "super_admin",
  "admin",
  "auditor",
  "director",
  "psicologo",
]);
const createRoles = new Set<AuthUser["role"]>(["super_admin", "admin", "director", "psicologo"]);
export const canOpenPsicologia = (user: Pick<AuthUser, "role" | "permissions">) =>
  user.permissions === undefined
    ? viewRoles.has(user.role)
    : hasUserPermission(user, "psicologia.view");
export const canCreatePsicologia = (user: Pick<AuthUser, "role" | "permissions">) =>
  user.permissions === undefined
    ? createRoles.has(user.role)
    : hasUserPermission(user, "psicologia.create");
