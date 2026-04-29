import {
  alimentacionAccessRoleValues,
  alimentacionEditorRoleValues,
  type AuthUser,
} from "@cuidarte/contracts";

const ALIMENTACION_ACCESS_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  alimentacionAccessRoleValues,
);
const ALIMENTACION_EDITOR_ROLES: ReadonlySet<AuthUser["role"]> = new Set(
  alimentacionEditorRoleValues,
);

export function canOpenAlimentacion(user: Pick<AuthUser, "role">): boolean {
  return ALIMENTACION_ACCESS_ROLES.has(user.role);
}

export function canManageAlimentacion(user: Pick<AuthUser, "role">): boolean {
  return ALIMENTACION_EDITOR_ROLES.has(user.role);
}
