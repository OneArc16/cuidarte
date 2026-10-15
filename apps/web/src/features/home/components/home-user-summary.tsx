import { type AuthUser } from "@cuidarte/contracts";
import { MapPin } from "lucide-react";

import { formatRole, getInitials } from "../lib/home-formatters";

type HomeUserSummaryProps = {
  user: AuthUser;
  className?: string;
};

export function HomeUserSummary({ className = "home-user", user }: HomeUserSummaryProps) {
  const tenantLocation = formatTenantLocation(user);

  return (
    <section className={className} aria-label="Usuario logueado">
      <span className="home-user__avatar" aria-hidden="true">
        {getInitials(user.fullName)}
      </span>
      <div className="home-user__details">
        <strong>{user.fullName}</strong>
        <span>{formatRole(user.role)}</span>
        {tenantLocation === null ? null : (
          <span className="home-user__location">
            <MapPin aria-hidden="true" />
            Sede · {tenantLocation}
          </span>
        )}
      </div>
    </section>
  );
}

function formatTenantLocation(user: AuthUser): string | null {
  if (
    user.tenantId === null ||
    user.tenantMunicipality === null ||
    user.tenantMunicipality === undefined ||
    user.tenantDepartment === null ||
    user.tenantDepartment === undefined
  ) {
    return null;
  }

  return `${user.tenantMunicipality}, ${user.tenantDepartment}`;
}
