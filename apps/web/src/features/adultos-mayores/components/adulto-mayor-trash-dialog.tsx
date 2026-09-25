import { type AdultoMayorListItem } from "@cuidarte/contracts";
import { LoaderCircle, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { formatAdultoMayorDocument } from "../lib/adultos-mayores-formatters";

type AdultoMayorTrashDialogProps = {
  adultoMayor: AdultoMayorListItem;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

const TRASH_REASON_SUGGESTIONS = ["Duplicado", "Retiro del programa", "Datos incorrectos"];
const LOWERCASE_CONNECTORS = new Set(["de", "del", "la", "y"]);

export function AdultoMayorTrashDialog({
  adultoMayor,
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: AdultoMayorTrashDialogProps) {
  const [reason, setReason] = useState("");
  const dialogRef = useRef<HTMLElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const displayNames = formatTrashDialogText(adultoMayor.names);
  const displaySurnames = formatTrashDialogText(adultoMayor.surnames);
  const displayTenantName = formatTrashDialogText(adultoMayor.tenantName);
  const initials = (displayNames.trim().charAt(0) + displaySurnames.trim().charAt(0)).toUpperCase();

  useEffect(() => {
    openerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    reasonRef.current?.focus();

    return () => {
      if (openerRef.current?.isConnected) {
        openerRef.current.focus();
      }
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (!isPending) onClose();
        return;
      }

      if (event.key !== "Tab" || dialogRef.current === null) {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ),
      );

      if (focusableElements.length === 0) {
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (firstElement === undefined || lastElement === undefined) {
        return;
      }

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  function applySuggestion(suggestion: string) {
    setReason(suggestion);
    requestAnimationFrame(() => reasonRef.current?.focus());
  }

  return (
    <div
      className="adulto-trash-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) onClose();
      }}
    >
      <section
        ref={dialogRef}
        className="adulto-trash-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="adulto-trash-dialog-title"
        aria-describedby="adulto-trash-dialog-description"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="adulto-trash-dialog__body">
          <header className="adulto-trash-dialog__header">
            <div className="adulto-trash-dialog__heading">
              <span className="adulto-trash-dialog__icon" aria-hidden="true">
                <Trash2 />
              </span>
              <h2 id="adulto-trash-dialog-title">Enviar a papelera</h2>
            </div>
            <button
              className="adulto-trash-dialog__close"
              type="button"
              aria-label="Cerrar confirmación"
              disabled={isPending}
              onClick={onClose}
            >
              <X aria-hidden="true" />
            </button>
          </header>

          <p className="adulto-trash-dialog__description" id="adulto-trash-dialog-description">
            Se ocultará de listados, buscadores y reportes. Podrás restaurarlo desde la papelera.
          </p>

          <div className="adulto-trash-dialog__hero">
            <span className="adulto-trash-dialog__avatar" aria-hidden="true">
              {initials}
            </span>
            <div className="adulto-trash-dialog__person">
              <strong>
                {displayNames} {displaySurnames}
              </strong>
              <div className="adulto-trash-dialog__meta">
                <span className="adulto-trash-dialog__document">
                  {formatAdultoMayorDocument(adultoMayor.documentType, adultoMayor.documentNumber)}
                </span>
                <span className="adulto-trash-dialog__separator" aria-hidden="true">
                  ·
                </span>
                <span>{displayTenantName}</span>
              </div>
            </div>
          </div>

          <div className="adulto-trash-dialog__reason">
            <span className="adulto-trash-dialog__reason-label">
              <label htmlFor="adulto-trash-reason">Motivo</label>
              <em>Obligatorio</em>
            </span>
            <div className="adulto-trash-dialog__textarea-wrap">
              <textarea
                ref={reasonRef}
                id="adulto-trash-reason"
                value={reason}
                maxLength={250}
                disabled={isPending}
                onChange={(event) => setReason(event.target.value)}
                placeholder="¿Por qué lo envías a la papelera?"
              />
              <small aria-hidden="true">{reason.length}/250</small>
            </div>
            <span className="adulto-trash-dialog__suggestions" aria-label="Motivos sugeridos">
              {TRASH_REASON_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  disabled={isPending}
                  onClick={() => applySuggestion(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </span>
          </div>

          {errorMessage !== null ? (
            <p className="form-error" role="alert">
              {errorMessage}
            </p>
          ) : null}
        </div>

        <footer className="adulto-trash-dialog__footer">
          <button
            className="adulto-trash-dialog__cancel"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="adulto-trash-dialog__confirm"
            type="button"
            disabled={isPending || reason.trim().length < 5}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? (
              <LoaderCircle className="adulto-trash-dialog__spinner" aria-hidden="true" />
            ) : null}
            {isPending ? "Enviando..." : "Enviar a papelera"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function formatTrashDialogText(value: string): string {
  const trimmedValue = value.trim();

  if (trimmedValue === "" || trimmedValue !== trimmedValue.toLocaleUpperCase("es-CO")) {
    return trimmedValue;
  }

  return trimmedValue
    .split(/\s+/)
    .map((word, index) => {
      const normalizedWord = word.toLocaleLowerCase("es-CO");

      if (index > 0 && LOWERCASE_CONNECTORS.has(normalizedWord)) {
        return normalizedWord;
      }

      return normalizedWord.charAt(0).toLocaleUpperCase("es-CO") + normalizedWord.slice(1);
    })
    .join(" ");
}
