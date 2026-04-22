import { ChevronLeft } from "lucide-react";

type BackofficeTopBarProps = {
  eyebrow: string;
  onBack: () => void;
  title: string;
};

export function BackofficeTopBar({ eyebrow, onBack, title }: BackofficeTopBarProps) {
  return (
    <div className="backoffice-topbar">
      <button className="outline-action" type="button" onClick={onBack}>
        <ChevronLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
      </div>
    </div>
  );
}
