import { type AdultoMayorStatusHistoryEntry } from "@cuidarte/contracts";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

type AdultoMayorStatusHistoryProps = {
  entries: AdultoMayorStatusHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  onClose: () => void;
};

const STATUS_LABELS = {
  alive: "Vivo",
  deceased: "Fallecido",
} as const;

export function AdultoMayorStatusHistory({
  entries,
  isLoading,
  error,
  onClose,
}: AdultoMayorStatusHistoryProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    closeButtonRef.current?.focus();

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="adulto-status-history-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="adulto-status-history"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adulto-status-history-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="adulto-status-history__header">
          <div>
            <p className="eyebrow">Trazabilidad</p>
            <h2 id="adulto-status-history-title">Historial de estados</h2>
          </div>
          <button
            ref={closeButtonRef}
            className="adulto-status-history__close"
            type="button"
            aria-label="Cerrar historial"
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        {isLoading ? <p className="adulto-status-history__empty">Cargando historial...</p> : null}
        {error !== null ? <p className="form-error">{error}</p> : null}
        {!isLoading && error === null && entries.length === 0 ? (
          <p className="adulto-status-history__empty">Aún no hay cambios de estado registrados.</p>
        ) : null}
        {entries.length > 0 ? (
          <ol className="adulto-status-history__list">
            {entries.map((entry) => (
              <li key={entry.id}>
                <div className="adulto-status-history__marker" aria-hidden="true" />
                <div>
                  <strong>
                    {entry.previousStatus === null
                      ? "Estado inicial"
                      : `${STATUS_LABELS[entry.previousStatus]} → ${STATUS_LABELS[entry.newStatus]}`}
                  </strong>
                  <p>
                    {entry.changedByUserFullName} · {formatDateTime(entry.createdAt)}
                  </p>
                  {entry.newDeathDate !== null ? (
                    <p>Fecha de defunción: {formatDate(entry.newDeathDate)}</p>
                  ) : null}
                  {entry.reason !== null ? <p>Motivo: {entry.reason}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        ) : null}
      </section>
    </div>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" }).format(
    new Date(`${value}T00:00:00`),
  );
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
