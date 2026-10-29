import { type NutricionPlanDetail } from "@cuidarte/contracts";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { resolveNutricionApiError } from "../lib/nutricion-formatters";
import { useCreateNutricionFollowUpMutation } from "../model/nutricion-queries";

type NutricionFollowUpFormValues = {
  followUpDate: string;
  weightKg: string;
  heightCm: string;
  abdominalPerimeterCm: string;
  adherence: "alta" | "media" | "baja" | "sin_dato";
  progressNote: string;
  adjustments: string;
  nextFollowUpDate: string;
};

type NutricionFollowUpEditorProps = {
  plan: NutricionPlanDetail;
  onSaved: () => void;
};

function toNullableNumber(value: string): number | null {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : Number(trimmedValue);
}

function toNullableText(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

export function NutricionFollowUpEditor({ onSaved, plan }: NutricionFollowUpEditorProps) {
  const createMutation = useCreateNutricionFollowUpMutation(plan.id);
  const form = useForm<NutricionFollowUpFormValues>({
    defaultValues: {
      followUpDate: new Date().toISOString().slice(0, 10),
      weightKg: "",
      heightCm: "",
      abdominalPerimeterCm: "",
      adherence: "sin_dato",
      progressNote: "",
      adjustments: "",
      nextFollowUpDate: plan.nextFollowUpDate ?? "",
    },
  });

  function submit(values: NutricionFollowUpFormValues) {
    const weightKg = toNullableNumber(values.weightKg);
    const heightCm = toNullableNumber(values.heightCm);
    const abdominalPerimeterCm = toNullableNumber(values.abdominalPerimeterCm);

    if (
      [weightKg, heightCm, abdominalPerimeterCm].some(
        (value) => value !== null && Number.isNaN(value),
      )
    ) {
      form.setError("weightKg", { message: "Las medidas deben ser números válidos." });
      return;
    }

    createMutation.mutate(
      {
        followUpDate: values.followUpDate,
        weightKg,
        heightCm,
        abdominalPerimeterCm,
        adherence: values.adherence,
        progressNote: values.progressNote.trim(),
        adjustments: toNullableText(values.adjustments),
        nextFollowUpDate: values.nextFollowUpDate === "" ? null : values.nextFollowUpDate,
      },
      {
        onSuccess: () => {
          toast.success("Seguimiento nutricional registrado.");
          form.reset({
            followUpDate: new Date().toISOString().slice(0, 10),
            weightKg: "",
            heightCm: "",
            abdominalPerimeterCm: "",
            adherence: "sin_dato",
            progressNote: "",
            adjustments: "",
            nextFollowUpDate: plan.nextFollowUpDate ?? "",
          });
          onSaved();
        },
      },
    );
  }

  return (
    <form className="nutricion-follow-up-editor" noValidate onSubmit={form.handleSubmit(submit)}>
      <div className="nutricion-follow-up-editor__heading">
        <div>
          <p className="eyebrow">Seguimiento</p>
          <h3>Registrar control nutricional</h3>
        </div>
        <label>
          <span>Fecha</span>
          <input
            type="date"
            required
            {...form.register("followUpDate", { required: "Selecciona la fecha del control." })}
          />
        </label>
      </div>

      <div className="nutricion-form-grid nutricion-form-grid--three">
        <label>
          <span>Peso (kg)</span>
          <input inputMode="decimal" placeholder="Ej. 62.5" {...form.register("weightKg")} />
        </label>
        <label>
          <span>Talla (cm)</span>
          <input inputMode="decimal" placeholder="Ej. 160" {...form.register("heightCm")} />
        </label>
        <label>
          <span>Perímetro abdominal (cm)</span>
          <input inputMode="decimal" {...form.register("abdominalPerimeterCm")} />
        </label>
      </div>

      <div className="nutricion-form-grid">
        <label>
          <span>Adherencia al plan</span>
          <select {...form.register("adherence")}>
            <option value="sin_dato">Sin dato</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </label>
        <label>
          <span>Próximo control</span>
          <input type="date" {...form.register("nextFollowUpDate")} />
        </label>
      </div>

      <label>
        <span>Evolución observada</span>
        <textarea
          required
          rows={4}
          {...form.register("progressNote", { required: "Describe la evolución observada." })}
        />
      </label>
      <label>
        <span>Ajustes al plan</span>
        <textarea rows={3} {...form.register("adjustments")} />
      </label>

      {form.formState.errors.weightKg?.message !== undefined ? (
        <p className="field-error" role="alert">
          {form.formState.errors.weightKg.message}
        </p>
      ) : null}
      {form.formState.errors.followUpDate?.message !== undefined ? (
        <p className="field-error" role="alert">
          {form.formState.errors.followUpDate.message}
        </p>
      ) : null}
      {form.formState.errors.progressNote?.message !== undefined ? (
        <p className="field-error" role="alert">
          {form.formState.errors.progressNote.message}
        </p>
      ) : null}
      {createMutation.isError ? (
        <p className="form-error" role="alert">
          {resolveNutricionApiError(createMutation.error)}
        </p>
      ) : null}
      <button className="primary-action" type="submit" disabled={createMutation.isPending}>
        {createMutation.isPending ? "Registrando…" : "Guardar seguimiento"}
      </button>
    </form>
  );
}
