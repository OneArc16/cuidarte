import { type HomeDashboardIndicatorDefinition } from "../lib/home-dashboard-definitions";
import { formatDashboardMetricValue } from "../lib/home-formatters";

type HomeDashboardIndicatorCardProps = {
  definition: HomeDashboardIndicatorDefinition;
  total: number;
  onClick: () => void;
};

export function HomeDashboardIndicatorCard({
  definition,
  onClick,
  total,
}: HomeDashboardIndicatorCardProps) {
  const Icon = definition.icon;

  return (
    <button
      className="home-indicator-card"
      data-tone={definition.tone}
      type="button"
      aria-label={definition.label}
      onClick={onClick}
    >
      <span className="home-indicator-card__label">{definition.label}</span>
      <span className="home-indicator-card__icon" aria-hidden="true">
        <Icon />
      </span>
      <strong>{formatDashboardMetricValue(total)}</strong>
    </button>
  );
}
