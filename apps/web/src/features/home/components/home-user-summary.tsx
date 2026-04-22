import { type AuthUser } from "@cuidarte/contracts";

import { formatRole, getInitials } from "../lib/home-formatters";

type HomeUserSummaryProps = {
  user: AuthUser;
  className?: string;
};

export function HomeUserSummary({ className = "home-user", user }: HomeUserSummaryProps) {
  return (
    <section className={className} aria-label="Usuario logueado">
      <span className="home-user__avatar" aria-hidden="true">
        {getInitials(user.fullName)}
      </span>
      <div className="home-user__details">
        <strong>{user.fullName}</strong>
        <span>{formatRole(user.role)}</span>
      </div>
    </section>
  );
}
