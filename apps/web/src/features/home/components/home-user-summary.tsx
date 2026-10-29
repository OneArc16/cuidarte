import { type AuthUser } from "@cuidarte/contracts";
import { MapPin } from "lucide-react";
import { type ReactNode } from "react";

import { formatRole, formatTenantLocation, getInitials } from "../lib/home-formatters";

type HomeUserSummaryProps = {
  user: AuthUser;
  className?: string;
  asButton?: boolean;
  ariaExpanded?: boolean;
  ariaHaspopup?: "menu";
  ariaLabel?: string;
  endAdornment?: ReactNode;
  onClick?: () => void;
  showLocation?: boolean;
};

export function HomeUserSummary({
  ariaExpanded,
  ariaHaspopup,
  ariaLabel,
  asButton = false,
  className = "home-user",
  endAdornment,
  onClick,
  showLocation = true,
  user,
}: HomeUserSummaryProps) {
  const tenantLocation = formatTenantLocation(user);
  const summaryContent = (
    <>
      <span className="home-user__avatar" aria-hidden="true">
        {getInitials(user.fullName)}
      </span>
      <span className="home-user__details">
        <strong>{user.fullName}</strong>
        <span>{formatRole(user.role)}</span>
        {!showLocation || tenantLocation === null ? null : (
          <span className="home-user__location">
            <MapPin aria-hidden="true" />
            Sede · {tenantLocation}
          </span>
        )}
      </span>
      {endAdornment}
    </>
  );

  if (asButton) {
    return (
      <button
        className={`${className} home-user--interactive`}
        type="button"
        aria-expanded={ariaExpanded}
        aria-haspopup={ariaHaspopup}
        aria-label={ariaLabel}
        onClick={onClick}
      >
        {summaryContent}
      </button>
    );
  }

  return (
    <section className={className} aria-label="Usuario logueado">
      {summaryContent}
    </section>
  );
}
