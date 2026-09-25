import {
  alimentacionAccessRoleValues,
  alimentacionEditorRoleValues,
  hasUserPermission,
  type AuthUser,
} from "@cuidarte/contracts";

const ALIMENTACION_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  alimentacionAccessRoleValues,
);
const ALIMENTACION_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  alimentacionEditorRoleValues,
);

export function canOpenAlimentacion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ALIMENTACION_ACCESS_ROLES.has(user.role)
    : hasUserPermission(user, "alimentacion.view");
}

export function canManageAlimentacion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ALIMENTACION_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "alimentacion.create") ||
        hasUserPermission(user, "alimentacion.edit");
}

export function canImportAlimentacion(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? ALIMENTACION_EDITOR_ROLES.has(user.role)
    : hasUserPermission(user, "alimentacion.import") || canManageAlimentacion(user);
}

export function canCreateMultipleDateAlimentacion(
  user: Pick<AuthUser, "role" | "permissions">,
): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" || user.role === "admin"
    : hasUserPermission(user, "alimentacion.create_multiple_dates");
}
