import { type ShortcutHomeModule } from "../lib/home-modules";

type HomeAccessShortcutCardProps = {
  module: ShortcutHomeModule;
  onClick: () => void;
};

export function HomeAccessShortcutCard({ module, onClick }: HomeAccessShortcutCardProps) {
  const Icon = module.icon;

  return (
    <button
      className="home-shortcut-card home-access-shortcut-card"
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
      <span className="home-access-shortcut-card__note">Acceso directo</span>
    </button>
  );
}
