import { type ActividadGrupalEditDetail, type ActividadGrupalOrganizer } from "@cuidarte/contracts";
import { LoaderCircle, X } from "lucide-react";
import { useState } from "react";

import {
  formatActividadGrupalOrganizer,
  getActividadGrupalOrganizerOptions,
} from "../lib/actividades-grupales-formatters";

type Props = {
  activity: ActividadGrupalEditDetail;
  errorMessage: string | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (organizer: ActividadGrupalOrganizer, reason: string) => void;
};

export function ActividadGrupalActaCorrectionDialog({
  activity,
  errorMessage,
  isPending,
  onClose,
  onConfirm,
}: Props) {
  const [organizer, setOrganizer] = useState<ActividadGrupalOrganizer>(activity.organizer);
  const [reason, setReason] = useState("");
  const canSubmit = organizer !== activity.organizer && reason.trim().length > 0;

  return (
    <div
      className="actividad-delete-dialog-backdrop"
      role="presentation"
      onMouseDown={() => {
        if (!isPending) onClose();
      }}
    >
      <section
        className="actividad-delete-dialog actividad-correction-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="acta-correction-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="actividad-delete-dialog__header">
          <div>
            <p className="actividad-delete-dialog__eyebrow">Accion sensible</p>
            <h2 id="acta-correction-title">Corregir consecutivo</h2>
          </div>
          <button
            className="actividades-row-action actividad-delete-dialog__close-button"
            type="button"
            onClick={onClose}
            disabled={isPending}
            aria-label="Cerrar"
          >
            <X aria-hidden="true" />
          </button>
        </header>
        <p className="actividad-delete-dialog__message">
          Acta actual: <strong>{activity.actaNumber}</strong>. El organizador de la actividad y su
          consecutivo pasaran a la serie seleccionada.
        </p>
        <label className="actividad-correction-field">
          <span>Nuevo organizador</span>
          <select
            value={organizer}
            onChange={(event) => setOrganizer(event.target.value as ActividadGrupalOrganizer)}
            disabled={isPending}
          >
            {getActividadGrupalOrganizerOptions().map((option) => (
              <option key={option} value={option}>
                {formatActividadGrupalOrganizer(option)}
              </option>
            ))}
          </select>
        </label>
        <label className="actividad-correction-field">
          <span>Motivo</span>
          <textarea
            value={reason}
            maxLength={500}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Explica por que debe corregirse el acta."
            disabled={isPending}
          />
        </label>
        {errorMessage !== null ? (
          <p className="form-error" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <footer className="actividad-delete-dialog__actions actividad-correction-dialog__actions">
          <button
            className="outline-action actividad-correction-dialog__button actividad-correction-dialog__button--cancel"
            type="button"
            onClick={onClose}
            disabled={isPending}
          >
            Cancelar
          </button>
          <button
            className="primary-action actividad-correction-dialog__button actividad-correction-dialog__button--confirm"
            type="button"
            onClick={() => onConfirm(organizer, reason.trim())}
            disabled={!canSubmit || isPending}
          >
            {isPending ? (
              <LoaderCircle className="actividad-delete-dialog__spinner" aria-hidden="true" />
            ) : null}
            Corregir acta
          </button>
        </footer>
      </section>
    </div>
  );
}
