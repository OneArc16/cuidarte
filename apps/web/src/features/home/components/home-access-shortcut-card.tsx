import { ArrowRight } from "lucide-react";

import { type HomeModule } from "../lib/home-modules";

type HomeAccessShortcutCardProps = {
  module: HomeModule & {
    summaryLabel: string;
    directAccessDescription: string;
  };
  onClick: () => void;
};

export function HomeAccessShortcutCard({ module, onClick }: HomeAccessShortcutCardProps) {
  const Icon = module.icon;

  return (
    <button
      className="home-access-shortcut-card"
      type="button"
      aria-label={module.label}
      onClick={onClick}
    >
      <span className="home-access-shortcut-card__pattern" aria-hidden="true" />

      <span className="home-access-shortcut-card__icon-panel" aria-hidden="true">
        <span className="home-access-shortcut-card__icon-frame">
          <Icon />
        </span>
      </span>

      <span className="home-access-shortcut-card__content">
        <span className="home-access-shortcut-card__eyebrow">{module.summaryLabel}</span>
        <strong className="home-access-shortcut-card__title">{module.label}</strong>
        <span className="home-access-shortcut-card__description">
          {module.directAccessDescription}
        </span>
      </span>

      <span className="home-access-shortcut-card__arrow" aria-hidden="true">
        <ArrowRight />
      </span>
    </button>
  );
}
