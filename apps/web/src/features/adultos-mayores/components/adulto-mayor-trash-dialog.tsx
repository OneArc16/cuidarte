import { type AdultoMayorListItem } from "@cuidarte/contracts";
import { AlertTriangle, LoaderCircle, Trash2, X } from "lucide-react";
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
          <h2 id="adulto-trash-dialog-title">Enviar a papelera</h2>
          <button type="button" aria-label="Cerrar confirmacion" disabled={isPending} onClick={onClose}>
            <X aria-hidden="true" />
          </button>
        </header>

        <div className="adulto-trash-dialog__hero">
          <AlertTriangle aria-hidden="true" />
          <div>
            <strong>{adultoMayor.names} {adultoMayor.surnames}</strong>
            <span>{formatAdultoMayorDocument(adultoMayor.documentType, adultoMayor.documentNumber)}</span>
            <span>{adultoMayor.tenantName}</span>
          </div>
        </div>

        <p className="adulto-trash-dialog__description">
          Se ocultara de listados, buscadores y reportes. Podras restaurarlo despues.
        </p>

        <label className="adulto-trash-dialog__reason">
          <span>Motivo <em>Obligatorio</em></span>
          <textarea
            aria-label="Motivo"
            value={reason}
            maxLength={500}
            disabled={isPending}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Ej. Registro duplicado"
          />
        </label>

        {errorMessage !== null ? <p className="form-error" role="alert">{errorMessage}</p> : null}

        <footer>
          <button className="outline-action adulto-trash-dialog__cancel" type="button" disabled={isPending} onClick={onClose}>
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
