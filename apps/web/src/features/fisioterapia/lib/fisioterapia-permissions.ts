import { hasUserPermission, type AuthUser } from "@cuidarte/contracts";
export const canOpenFisioterapia = (user: AuthUser) =>
  user.permissions === undefined
    ? ["super_admin", "admin", "auditor", "director", "fisioterapeuta"].includes(user.role)
    : hasUserPermission(user, "fisioterapia.view");
export const canCreateFisioterapia = (user: AuthUser) =>
  user.permissions === undefined
    ? ["super_admin", "admin", "director", "fisioterapeuta"].includes(user.role)
    : hasUserPermission(user, "fisioterapia.create");
