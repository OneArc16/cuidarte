import { type HomeModule } from "../lib/home-modules";

type HomeModuleButtonProps = {
  module: HomeModule;
  isActive: boolean;
  variant: "desktop" | "mobile" | "sheet";
  onClick?: () => void;
};

export function HomeModuleButton({ module, isActive, variant, onClick }: HomeModuleButtonProps) {
  const Icon = module.icon;

  return (
    <button
      className={
        isActive
          ? `module-button module-button--${variant} module-button--active`
          : `module-button module-button--${variant}`
      }
      type="button"
      aria-label={module.label}
      aria-current={isActive ? "page" : undefined}
      onClick={onClick}
    >
      <span className="module-button__icon" aria-hidden="true">
        <Icon />
      </span>
      <span className="module-button__label">{module.label}</span>
    </button>
  );
}
