import {
  type NutricionAdultoResumen,
  type NutricionMealSlot,
  type NutricionPlanDetail,
} from "@cuidarte/contracts";
import { Plus, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";
import { type FieldErrors, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";

import {
  nutricionMealSlots,
  formatNutricionMealSlot,
  resolveNutricionApiError,
} from "../lib/nutricion-formatters";
import {
  useCreateNutricionPlanMutation,
  useUpdateNutricionPlanMutation,
} from "../model/nutricion-queries";
import { NutricionAdultoSummary } from "./nutricion-adulto-summary";

type MealFormValue = {
  slot: NutricionMealSlot;
  instruction: string;
  portion: string;
  frequency: string;
};

type NutricionPlanFormValues = {
  startDate: string;
  nextFollowUpDate: string;
  status: "active" | "completed";
  assessment: string;
  goal: string;
  recommendations: string;
  restrictions: string;
  meals: MealFormValue[];
};

type NutricionPlanEditorProps = {
  adultoMayorId: string;
  adultoMayor?: NutricionAdultoResumen;
  context?: "attention" | "plan";
  plan?: NutricionPlanDetail;
  onCancel: () => void;
  onSaved: (planId: string) => void;
};

const EDITOR_SECTIONS = [
  { id: "assessment", label: "Valoración" },
  { id: "diet", label: "Plan alimentario" },
] as const;

type EditorSectionId = (typeof EDITOR_SECTIONS)[number]["id"];

const DEFAULT_MEAL: MealFormValue = {
  slot: "desayuno",
  instruction: "",
  portion: "",
  frequency: "",
};

function toFormValues(plan: NutricionPlanDetail | undefined): NutricionPlanFormValues {
  if (plan === undefined) {
    return {
      startDate: new Date().toISOString().slice(0, 10),
      nextFollowUpDate: "",
      status: "active",
      assessment: "",
      goal: "",
      recommendations: "",
      restrictions: "",
      meals: [DEFAULT_MEAL],
    };
  }

  return {
    startDate: plan.startDate,
    nextFollowUpDate: plan.nextFollowUpDate ?? "",
    status: plan.status === "completed" ? "completed" : "active",
    assessment: plan.assessment,
    goal: plan.goal,
    recommendations: plan.recommendations,
    restrictions: plan.restrictions ?? "",
    meals: plan.meals.map((meal) => ({
      slot: meal.slot,
      instruction: meal.instruction,
      portion: meal.portion ?? "",
      frequency: meal.frequency ?? "",
    })),
  };
}

function toNullable(value: string): string | null {
  const trimmedValue = value.trim();
  return trimmedValue === "" ? null : trimmedValue;
}

export function NutricionPlanEditor({
  adultoMayorId,
  adultoMayor,
  context = "plan",
  onCancel,
  onSaved,
  plan,
}: NutricionPlanEditorProps) {
  const isEditing = plan !== undefined;
  const showsAttentionSummary = context === "attention" && adultoMayor !== undefined;
  const createMutation = useCreateNutricionPlanMutation();
  const updateMutation = useUpdateNutricionPlanMutation(plan?.id ?? "");
  const form = useForm<NutricionPlanFormValues>({ defaultValues: toFormValues(plan) });
  const { control, formState, handleSubmit, register, reset, setError, watch } = form;
  const { append, fields, remove } = useFieldArray({ control, name: "meals" });
  const meals = watch("meals");
  const [activeSection, setActiveSection] = useState<EditorSectionId>("assessment");
  const tabPanelIdPrefix = useId();
  const [mealToAdd, setMealToAdd] = useState<NutricionMealSlot>("almuerzo");
  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    reset(toFormValues(plan));
  }, [plan, reset]);

  const occupiedSlots = new Set(meals.map((meal) => meal.slot));
  const availableSlots = nutricionMealSlots.filter((slot) => !occupiedSlots.has(slot));
  const validationError = [
    formState.errors.startDate?.message,
    formState.errors.assessment?.message,
    formState.errors.goal?.message,
    formState.errors.recommendations?.message,
    ...fields.map((_, index) => formState.errors.meals?.[index]?.instruction?.message),
  ].find((message): message is string => typeof message === "string");

  function save(values: NutricionPlanFormValues) {
    const normalizedMeals = values.meals.map((meal) => ({
      slot: meal.slot,
      instruction: meal.instruction.trim(),
      portion: toNullable(meal.portion),
      frequency: toNullable(meal.frequency),
    }));

    if (normalizedMeals.some((meal) => meal.instruction === "")) {
      setError("meals", { message: "Describe cada comida incluida en el plan." });
      return;
    }

    const commonPayload = {
      startDate: values.startDate,
      nextFollowUpDate: values.nextFollowUpDate === "" ? null : values.nextFollowUpDate,
      assessment: values.assessment.trim(),
      goal: values.goal.trim(),
      recommendations: values.recommendations.trim(),
      restrictions: toNullable(values.restrictions),
      meals: normalizedMeals,
    };

    if (!isEditing) {
      createMutation.mutate(
        { ...commonPayload, adultoMayorId },
        {
          onSuccess: (detail) => {
            toast.success(
              context === "attention"
                ? "Atención nutricional registrada."
                : "Plan nutricional creado.",
            );
            onSaved(detail.id);
          },
        },
      );
      return;
    }

    updateMutation.mutate(
      { ...commonPayload, status: values.status, version: plan.version },
      {
        onSuccess: (detail) => {
          toast.success("Plan nutricional actualizado.");
          onSaved(detail.id);
        },
      },
    );
  }

  function handleInvalid(errors: FieldErrors<NutricionPlanFormValues>) {
    if (
      errors.nextFollowUpDate !== undefined ||
      errors.recommendations !== undefined ||
      errors.meals !== undefined
    ) {
      setActiveSection("diet");
      return;
    }

    setActiveSection("assessment");
  }

  const mutationError = createMutation.error ?? updateMutation.error;

  return (
    <form className="nutricion-editor" noValidate onSubmit={handleSubmit(save, handleInvalid)}>
      {showsAttentionSummary ? (
        <NutricionAdultoSummary adultoMayor={adultoMayor} />
      ) : (
        <div className="nutricion-editor__heading">
          <div>
            <p className="eyebrow">
              {context === "attention" ? "Atención nutricional" : "Plan personalizado"}
            </p>
            <h2>
              {isEditing
                ? "Actualizar plan"
                : context === "attention"
                  ? "Nueva atención nutricional"
                  : "Crear plan de alimentación"}
            </h2>
          </div>
          {isEditing ? (
            <label className="nutricion-status-field">
              <span>Estado</span>
              <select {...register("status")} disabled={isPending}>
                <option value="active">Activo</option>
                <option value="completed">Finalizado</option>
              </select>
            </label>
          ) : null}
        </div>
      )}

      <nav
        className="nutricion-editor-tabs"
        role="tablist"
        aria-label="Secciones de la atención nutricional"
      >
        {EDITOR_SECTIONS.map((section) => {
          const isActive = activeSection === section.id;

          return (
            <button
              aria-controls={`${tabPanelIdPrefix}-${section.id}-panel`}
              aria-selected={isActive}
              className={isActive ? "is-active" : ""}
              id={`${tabPanelIdPrefix}-${section.id}-tab`}
              key={section.id}
              role="tab"
              type="button"
              onClick={() => setActiveSection(section.id)}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <section
        aria-labelledby={`${tabPanelIdPrefix}-assessment-tab`}
        className="nutricion-editor-panel"
        hidden={activeSection !== "assessment"}
        id={`${tabPanelIdPrefix}-assessment-panel`}
        role="tabpanel"
      >
        <div className="nutricion-form-grid nutricion-form-grid--dates">
          <label>
            <span>Inicio del plan</span>
            <input
              type="date"
              required
              {...register("startDate", { required: "Selecciona la fecha de inicio." })}
            />
          </label>
        </div>

        <div className="nutricion-form-grid">
          <label>
            <span>Valoración nutricional</span>
            <textarea
              required
              rows={4}
              {...register("assessment", { required: "Registra la valoración nutricional." })}
            />
          </label>
          <label>
            <span>Objetivo del plan</span>
            <textarea
              required
              rows={4}
              {...register("goal", { required: "Registra el objetivo del plan." })}
            />
          </label>
        </div>

        <label className="nutricion-editor__full-field">
          <span>Restricciones, alergias o consideraciones</span>
          <textarea rows={3} {...register("restrictions")} />
        </label>
      </section>

      <section
        aria-labelledby={`${tabPanelIdPrefix}-diet-tab`}
        className="nutricion-editor-panel"
        hidden={activeSection !== "diet"}
        id={`${tabPanelIdPrefix}-diet-panel`}
        role="tabpanel"
      >
        <div className="nutricion-form-grid nutricion-form-grid--dates">
          <label>
            <span>Próximo control</span>
            <input type="date" {...register("nextFollowUpDate")} />
          </label>
        </div>

        <label className="nutricion-editor__full-field">
          <span>Recomendaciones generales</span>
          <textarea
            required
            rows={4}
            {...register("recommendations", {
              required: "Registra las recomendaciones generales.",
            })}
          />
        </label>

        <section className="nutricion-meals" aria-labelledby="nutricion-meals-title">
          <div className="nutricion-meals__header">
            <div>
              <h3 id="nutricion-meals-title">Comidas del plan</h3>
              <p>Agrega solo los tiempos de comida que requiera la persona.</p>
            </div>
            {availableSlots.length > 0 ? (
              <div className="nutricion-meals__add">
                <select
                  value={mealToAdd}
                  onChange={(event) => setMealToAdd(event.target.value as NutricionMealSlot)}
                >
                  {availableSlots.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatNutricionMealSlot(slot)}
                    </option>
                  ))}
                </select>
                <button
                  className="outline-action"
                  type="button"
                  onClick={() => {
                    append({ ...DEFAULT_MEAL, slot: mealToAdd });
                    setMealToAdd(availableSlots.find((slot) => slot !== mealToAdd) ?? mealToAdd);
                  }}
                >
                  <Plus aria-hidden="true" />
                  <span>Agregar</span>
                </button>
              </div>
            ) : null}
          </div>

          <div className="nutricion-meals__list">
            {fields.map((field, index) => (
              <article className="nutricion-meal-card" key={field.id}>
                <div className="nutricion-meal-card__header">
                  <label>
                    <span>Tiempo de comida</span>
                    <select {...register(`meals.${index}.slot`)}>
                      {nutricionMealSlots.map((slot) => (
                        <option
                          disabled={meals.some(
                            (meal, mealIndex) => mealIndex !== index && meal.slot === slot,
                          )}
                          key={slot}
                          value={slot}
                        >
                          {formatNutricionMealSlot(slot)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    aria-label={`Quitar ${formatNutricionMealSlot(meals[index]?.slot ?? "desayuno")}`}
                    className="nutricion-icon-button"
                    disabled={fields.length === 1}
                    type="button"
                    onClick={() => remove(index)}
                  >
                    <Trash2 aria-hidden="true" />
                  </button>
                </div>
                <label>
                  <span>Indicaciones</span>
                  <textarea
                    required
                    rows={3}
                    {...register(`meals.${index}.instruction`, {
                      required: "Describe las indicaciones para esta comida.",
                    })}
                  />
                </label>
                <div className="nutricion-form-grid">
                  <label>
                    <span>Porción (opcional)</span>
                    <input {...register(`meals.${index}.portion`)} />
                  </label>
                  <label>
                    <span>Frecuencia (opcional)</span>
                    <input {...register(`meals.${index}.frequency`)} />
                  </label>
                </div>
              </article>
            ))}
          </div>
          {formState.errors.meals?.message !== undefined ? (
            <p className="field-error" role="alert">
              {formState.errors.meals.message}
            </p>
          ) : null}
        </section>
      </section>

      {validationError !== undefined ? (
        <p className="field-error" role="alert">
          {validationError}
        </p>
      ) : null}

      {mutationError !== null ? (
        <p className="form-error" role="alert">
          {resolveNutricionApiError(mutationError)}
        </p>
      ) : null}

      <footer className="nutricion-editor__actions">
        <button className="outline-action" type="button" disabled={isPending} onClick={onCancel}>
          Cancelar
        </button>
        <button className="primary-action" type="submit" disabled={isPending}>
          {isPending
            ? "Guardando…"
            : isEditing
              ? "Guardar cambios"
              : context === "attention"
                ? "Registrar atención"
                : "Crear plan"}
        </button>
      </footer>
    </form>
  );
}
