import {
  type CreatePsicologiaSessionRequest,
  type PsicologiaAdultoResumen,
} from "@cuidarte/contracts";
import { useId, useState } from "react";
import { useForm, type FieldErrors } from "react-hook-form";
import { toast } from "sonner";
import { PsicologiaAdultoSummary } from "./psicologia-adulto-summary";
type Values = Omit<CreatePsicologiaSessionRequest, "adultoMayorId"> & {
  agreements: string;
  nextSessionDate: string;
};
const sections = [
  { id: "valoracion", label: "Valoración" },
  { id: "intervencion", label: "Intervención y acuerdos" },
] as const;
type Section = (typeof sections)[number]["id"];
type Props = {
  adulto: PsicologiaAdultoResumen;
  isPending: boolean;
  error: string | null;
  onCancel: () => void;
  onSubmit: (value: CreatePsicologiaSessionRequest) => Promise<void>;
};
export function PsicologiaSessionForm({ adulto, isPending, error, onCancel, onSubmit }: Props) {
  const [active, setActive] = useState<Section>("valoracion");
  const id = useId();
  const { register, handleSubmit, formState } = useForm<Values>({
    defaultValues: {
      sessionDate: new Date().toISOString().slice(0, 10),
      modality: "individual",
      reason: "",
      assessment: "",
      intervention: "",
      agreements: "",
      nextSessionDate: "",
    },
  });
  function invalid(errors: FieldErrors<Values>) {
    setActive(
      errors.intervention || errors.agreements || errors.nextSessionDate
        ? "intervencion"
        : "valoracion",
    );
  }
  return (
    <form
      className="psicologia-form"
      noValidate
      onSubmit={handleSubmit(async (value) => {
        await onSubmit({
          ...value,
          adultoMayorId: adulto.id,
          agreements: value.agreements || null,
          nextSessionDate: value.nextSessionDate || null,
        });
        toast.success("Sesión de psicología registrada.");
      }, invalid)}
    >
      <PsicologiaAdultoSummary adulto={adulto} />
      <nav className="psicologia-tabs" role="tablist" aria-label="Secciones de la sesión">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            role="tab"
            id={`${id}-${section.id}-tab`}
            aria-selected={active === section.id}
            aria-controls={`${id}-${section.id}-panel`}
            className={active === section.id ? "is-active" : ""}
            onClick={() => setActive(section.id)}
          >
            {section.label}
          </button>
        ))}
      </nav>
      <section
        className="psicologia-panel"
        hidden={active !== "valoracion"}
        role="tabpanel"
        id={`${id}-valoracion-panel`}
        aria-labelledby={`${id}-valoracion-tab`}
      >
        <div className="psicologia-grid">
          <label>
            <span>Fecha de la sesión</span>
            <input type="date" {...register("sessionDate", { required: "Selecciona la fecha." })} />
          </label>
          <label>
            <span>Modalidad</span>
            <select {...register("modality")}>
              <option value="individual">Individual</option>
              <option value="familiar">Familiar</option>
            </select>
          </label>
        </div>
        <label>
          <span>Motivo de consulta</span>
          <textarea
            rows={4}
            {...register("reason", { required: "Registra el motivo de consulta." })}
          />
        </label>
        <label>
          <span>Valoración psicológica</span>
          <textarea rows={7} {...register("assessment", { required: "Registra la valoración." })} />
        </label>
      </section>
      <section
        className="psicologia-panel"
        hidden={active !== "intervencion"}
        role="tabpanel"
        id={`${id}-intervencion-panel`}
        aria-labelledby={`${id}-intervencion-tab`}
      >
        <label>
          <span>Intervención realizada</span>
          <textarea
            rows={7}
            {...register("intervention", { required: "Registra la intervención." })}
          />
        </label>
        <label>
          <span>Acuerdos y recomendaciones</span>
          <textarea rows={5} {...register("agreements")} />
        </label>
        <label>
          <span>Próxima sesión</span>
          <input type="date" {...register("nextSessionDate")} />
        </label>
      </section>
      {Object.keys(formState.errors).length > 0 ? (
        <p className="field-error" role="alert">
          Revisa los campos requeridos.
        </p>
      ) : null}
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <footer className="psicologia-actions">
        <button className="outline-action" type="button" onClick={onCancel} disabled={isPending}>
          Cancelar
        </button>
        <button className="primary-action" type="submit" disabled={isPending}>
          {isPending ? "Guardando…" : "Registrar sesión"}
        </button>
      </footer>
    </form>
  );
}
