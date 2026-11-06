import { type AdultoMayorProgramPeriod } from "@cuidarte/contracts";
import { type FormEvent, useState } from "react";
import { toast } from "sonner";

import { getLocalDateInputValue } from "@/shared/lib/date-input";

import { resolveAdultosMayoresApiError } from "../lib/adultos-mayores-formatters";
import {
  useAdultoMayorProgramPeriodsQuery,
  useChangeAdultoMayorProgramMutation,
} from "../model/adultos-mayores-queries";

type AdultoMayorProgramPanelProps = {
  adultoMayorId: string;
};

export function AdultoMayorProgramPanel({ adultoMayorId }: AdultoMayorProgramPanelProps) {
  const periodsQuery = useAdultoMayorProgramPeriodsQuery(adultoMayorId);
  const changeMutation = useChangeAdultoMayorProgramMutation(adultoMayorId);
  const [date, setDate] = useState(() => getLocalDateInputValue());
  const [reason, setReason] = useState("");
  const programStatus = periodsQuery.data?.programStatus;
  const isActive = programStatus === "active";
  const periods = [...(periodsQuery.data?.periods ?? [])].reverse();
  const actionLabel = isActive ? "Inactivar" : "Reintegrar";
  const dateLabel = isActive ? "Fecha de inactivación" : "Fecha de reintegro";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedReason = reason.trim() === "" ? null : reason.trim();

    try {
      await changeMutation.mutateAsync(
        isActive
          ? { kind: "inactivate", request: { inactivationDate: date, reason: trimmedReason } }
          : { kind: "reintegrate", request: { activationDate: date, reason: trimmedReason } },
      );
    } catch {
      // The mutation error is rendered below the form.
      return;
    }

    setReason("");
    toast.success(isActive ? "Adulto mayor inactivado." : "Adulto mayor reintegrado.");
  }

  return (
    <section className="adulto-program-panel" aria-labelledby="adulto-program-title">
      <header className="adulto-program-panel__header">
        <div>
          <p className="eyebrow">Programa</p>
          <h2 id="adulto-program-title">Activación en el programa</h2>
        </div>
        {programStatus === undefined ? null : (
          <span className="adulto-program-badge" data-state={programStatus}>
            {isActive ? "Activo" : "Inactivo"}
          </span>
        )}
      </header>

      {periodsQuery.isLoading ? <p>Cargando periodos...</p> : null}
      {periodsQuery.isError ? (
        <p className="form-error" role="alert">
          {resolveAdultosMayoresApiError(periodsQuery.error)}
        </p>
      ) : null}

      {programStatus !== undefined ? (
        <form className="adulto-program-panel__form" onSubmit={(event) => void handleSubmit(event)}>
          <label>
            <span>{dateLabel}</span>
            <input
              type="date"
              required
              max={getLocalDateInputValue()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
            />
          </label>
          <label>
            <span>Motivo (opcional)</span>
            <input
              type="text"
              maxLength={500}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <button className="primary-action" type="submit" disabled={changeMutation.isPending}>
            {changeMutation.isPending ? "Guardando..." : actionLabel}
          </button>
          {changeMutation.isError ? (
            <p className="form-error" role="alert">
              {resolveAdultosMayoresApiError(changeMutation.error)}
            </p>
          ) : null}
        </form>
      ) : null}

      {periods.length > 0 ? (
        <ol className="adulto-program-panel__periods" aria-label="Periodos en el programa">
          {periods.map((period) => (
            <li key={period.id}>
              <strong>{formatPeriodRange(period)}</strong>
              {period.activationReason !== null ? (
                <p>Motivo de ingreso: {period.activationReason}</p>
              ) : null}
              {period.inactivationReason !== null ? (
                <p>Motivo de salida: {period.inactivationReason}</p>
              ) : null}
              {formatPeriodAuthors(period)}
            </li>
          ))}
        </ol>
      ) : null}
    </section>
  );
}

function formatPeriodRange(period: AdultoMayorProgramPeriod) {
  const from = formatDate(period.activationDate);

  return period.inactivationDate === null
    ? `Activo desde ${from}`
    : `Activo del ${from} al ${formatDate(period.inactivationDate)}`;
}

function formatPeriodAuthors(period: AdultoMayorProgramPeriod) {
  const authors = [
    period.activatedByUserFullName === null ? null : `Activó: ${period.activatedByUserFullName}`,
    period.inactivatedByUserFullName === null
      ? null
      : `Inactivó: ${period.inactivatedByUserFullName}`,
  ].filter((value) => value !== null);

  return authors.length === 0 ? null : <p>{authors.join(" · ")}</p>;
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
