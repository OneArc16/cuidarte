import { type AlimentacionDetail, type UpdateAlimentacionRequest } from "@cuidarte/contracts";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, Sparkles, X } from "lucide-react";
import { useEffect } from "react";
import { type Resolver, useForm } from "react-hook-form";

import {
  formatAlimentacionOrganizer,
  formatAlimentacionStatus,
  getAlimentacionOrganizerOptions,
  getAlimentacionStatusOptions,
} from "../lib/alimentacion-formatters";
import {
  type AlimentacionRecordFormValues,
  alimentacionRecordFormSchema,
  createDefaultAlimentacionRecordFormValues,
  toUpdateAlimentacionRequest,
} from "../schemas/alimentacion-record-form.schema";
import { AlimentacionFieldGroup } from "./alimentacion-field-group";

type AlimentacionRecordFormProps = {
  error: string | null;
  isPending: boolean;
  record: AlimentacionDetail;
  onCancel: () => void;
  onSubmit: (request: UpdateAlimentacionRequest) => void;
};

export function AlimentacionRecordForm({
  error,
  isPending,
  onCancel,
  onSubmit,
  record,
}: AlimentacionRecordFormProps) {
  const form = useForm<AlimentacionRecordFormValues>({
    resolver: zodResolver(alimentacionRecordFormSchema) as Resolver<AlimentacionRecordFormValues>,
    defaultValues: createDefaultAlimentacionRecordFormValues(record),
    mode: "onBlur",
  });

  useEffect(() => {
    form.reset(createDefaultAlimentacionRecordFormValues(record));
  }, [form, record]);

  function getError(field: keyof AlimentacionRecordFormValues): string | undefined {
    const message = form.formState.errors[field]?.message;

    return typeof message === "string" ? message : undefined;
  }

  return (
    <form
      className="alimentacion-form"
      noValidate
      onSubmit={(event) => {
        void form.handleSubmit((values) => onSubmit(toUpdateAlimentacionRequest(values)))(event);
      }}
    >
      <section className="alimentacion-form-shell">
        <aside className="alimentacion-form-summary">
          <div className="alimentacion-form-summary__metric">
            <span className="eyebrow">Adulto mayor</span>
            <strong>{record.fullName}</strong>
            <small>{record.documentNumber}</small>
          </div>

          <div className="alimentacion-form-summary__note">
            <Sparkles aria-hidden="true" />
            <p>
              Ajusta fecha, organizador y estados del registro sin perder la trazabilidad del
              adulto mayor y su centro.
            </p>
          </div>
        </aside>

        <section className="alimentacion-form-panel">
          <div className="alimentacion-form-grid">
            <AlimentacionFieldGroup label="Centro">
              <input type="text" value={record.tenantName} readOnly disabled />
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup label="Fecha" error={getError("deliveryDate")}>
              <input
                type="date"
                aria-invalid={getError("deliveryDate") === undefined ? "false" : "true"}
                {...form.register("deliveryDate")}
              />
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup label="Organizador" error={getError("organizer")}>
              <select
                aria-invalid={getError("organizer") === undefined ? "false" : "true"}
                {...form.register("organizer")}
              >
                {getAlimentacionOrganizerOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatAlimentacionOrganizer(option)}
                  </option>
                ))}
              </select>
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup label="Refrigerio 1" error={getError("refrigerio1")}>
              <select
                aria-invalid={getError("refrigerio1") === undefined ? "false" : "true"}
                {...form.register("refrigerio1")}
              >
                {getAlimentacionStatusOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatAlimentacionStatus(option)}
                  </option>
                ))}
              </select>
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup label="Almuerzo" error={getError("almuerzo")}>
              <select
                aria-invalid={getError("almuerzo") === undefined ? "false" : "true"}
                {...form.register("almuerzo")}
              >
                {getAlimentacionStatusOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatAlimentacionStatus(option)}
                  </option>
                ))}
              </select>
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup label="Refrigerio 2" error={getError("refrigerio2")}>
              <select
                aria-invalid={getError("refrigerio2") === undefined ? "false" : "true"}
                {...form.register("refrigerio2")}
              >
                {getAlimentacionStatusOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatAlimentacionStatus(option)}
                  </option>
                ))}
              </select>
            </AlimentacionFieldGroup>

            <AlimentacionFieldGroup
              label="Auxilio Transporte"
              error={getError("auxilioTransporte")}
            >
              <select
                aria-invalid={getError("auxilioTransporte") === undefined ? "false" : "true"}
                {...form.register("auxilioTransporte")}
              >
                {getAlimentacionStatusOptions().map((option) => (
                  <option key={option} value={option}>
                    {formatAlimentacionStatus(option)}
                  </option>
                ))}
              </select>
            </AlimentacionFieldGroup>
          </div>
        </section>
      </section>

      {error !== null ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      <div className="alimentacion-form-actions">
        <button
          className="outline-action alimentacion-form-action alimentacion-form-action--cancel"
          type="button"
          onClick={onCancel}
        >
          <X aria-hidden="true" />
          Cancelar
        </button>
        <button
          className="primary-action alimentacion-form-action alimentacion-form-action--save"
          type="submit"
          aria-label="Guardar cambios"
          data-tooltip="Guardar"
          disabled={isPending}
        >
          <Save aria-hidden="true" />
          {isPending ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </form>
  );
}
