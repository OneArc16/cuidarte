import { type AuthUser } from "@cuidarte/contracts";

const ROLE_LABELS = {
  super_admin: "SuperAdmin",
  tenant_admin: "Admin de tenant",
  employee: "Empleado",
} satisfies Record<AuthUser["role"], string>;

export function formatRole(role: AuthUser["role"]): string {
  return ROLE_LABELS[role];
}

export function getInitials(fullName: string): string {
  const initials = fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((namePart) => namePart[0]?.toUpperCase() ?? "")
    .join("");

  return initials === "" ? "CT" : initials;
}
