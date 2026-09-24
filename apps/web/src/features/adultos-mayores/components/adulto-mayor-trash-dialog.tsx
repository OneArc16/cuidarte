import { type AdultoMayorListItem } from "@cuidarte/contracts";
import { LoaderCircle, RotateCcw, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { formatAdultoMayorDocument } from "../lib/adultos-mayores-formatters";

type AdultoMayorTrashDialogProps = {
  adultoMayor: AdultoMayorListItem;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function AdultoMayorTrashDialog({
  adultoMayor,
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: AdultoMayorTrashDialogProps) {
  const [reason, setReason] = useState("");
  const initials = (
    adultoMayor.names.trim().charAt(0) + adultoMayor.surnames.trim().charAt(0)
  ).toUpperCase();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isPending) onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isPending, onClose]);

  return (
    <div
      className="adulto-trash-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) onClose();
      }}
    >
      <section
        className="adulto-trash-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="adulto-trash-dialog-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="adulto-trash-dialog__header">
          <div>
            <p className="adulto-trash-dialog__eyebrow">
              <RotateCcw aria-hidden="true" />
              Acción reversible
            </p>
            <h2 id="adulto-trash-dialog-title">Enviar a papelera</h2>
          </div>
          <button
            type="button"
            aria-label="Cerrar confirmación"
            disabled={isPending}
            onClick={onClose}
          >
            <X aria-hidden="true" />
          </button>
        </header>

        <p className="adulto-trash-dialog__description">
          Se ocultará de listados, buscadores y reportes. Podrás restaurarlo desde la papelera
          cuando lo necesites.
        </p>

        <div className="adulto-trash-dialog__hero">
          <span className="adulto-trash-dialog__avatar" aria-hidden="true">
            {initials}
          </span>
          <div>
            <strong>
              {adultoMayor.names} {adultoMayor.surnames}
            </strong>
            <span>
              {formatAdultoMayorDocument(adultoMayor.documentType, adultoMayor.documentNumber)}
              <b aria-hidden="true"> • </b>
              {adultoMayor.tenantName}
            </span>
          </div>
        </div>

        <label className="adulto-trash-dialog__reason">
          <span>
            Motivo <em>Obligatorio</em>
          </span>
          <textarea
            aria-label="Motivo"
            value={reason}
            maxLength={250}
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Escribe el motivo de la eliminación"
          />
          <small>{reason.length}/250</small>
        </label>

        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <footer>
          <button
            className="outline-action adulto-trash-dialog__cancel"
            type="button"
            disabled={isPending}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            className="primary-action adulto-trash-dialog__confirm"
            type="button"
            disabled={isPending || reason.trim() === ""}
            onClick={() => onConfirm(reason.trim())}
          >
            {isPending ? <LoaderCircle aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {isPending ? "Enviando..." : "Enviar a papelera"}
          </button>
        </footer>
      </section>
    </div>
  );
}
