import { type ShortcutHomeModule } from "../lib/home-modules";
import { formatDashboardMetricValue } from "../lib/home-formatters";

type HomeDashboardShortcutCardProps = {
  module: ShortcutHomeModule;
  total: number | undefined;
  onClick: () => void;
};

export function HomeDashboardShortcutCard({
  module,
  onClick,
  total,
}: HomeDashboardShortcutCardProps) {
  const Icon = module.icon;

  return (
    <button
      className="home-shortcut-card"
      type="button"
      aria-label={module.label}
      onClick={onClick}
    >
      <span className="home-shortcut-card__eyebrow">{module.summaryLabel}</span>
      <span className="home-shortcut-card__header">
        <strong>{module.label}</strong>
        <span className="home-shortcut-card__icon" aria-hidden="true">
          <Icon />
        </span>
      </span>
      <span className="home-shortcut-card__total">{formatDashboardMetricValue(total)}</span>
      <span className="home-shortcut-card__description">{module.summaryDescription}</span>
    </button>
  );
}
