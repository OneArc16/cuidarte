import { type NutricionPlanDetail } from "@cuidarte/contracts";
import { CalendarClock, ClipboardCheck, Pencil, Scale, Utensils } from "lucide-react";

import {
  formatNutricionAdherence,
  formatNutricionDate,
  formatNutricionMealSlot,
  formatNutricionPlanStatus,
} from "../lib/nutricion-formatters";
import { NutricionFollowUpEditor } from "./nutricion-follow-up-editor";

type NutricionPlanDetailProps = {
  canCreateFollowUp: boolean;
  isEditing: boolean;
  plan: NutricionPlanDetail;
  onEdit: () => void;
  onFollowUpSaved: () => void;
};

export function NutricionPlanDetailView({
  canCreateFollowUp,
  isEditing,
  onEdit,
  onFollowUpSaved,
  plan,
}: NutricionPlanDetailProps) {
  return (
    <div className="nutricion-plan-detail">
      <header className="nutricion-plan-detail__header">
        <div>
          <p className="eyebrow">Plan nutricional</p>
          <h2>{plan.goal}</h2>
          <p>Creado por {plan.professional.fullName}</p>
        </div>
        <div className="nutricion-plan-detail__header-actions">
          <span className={`nutricion-plan-status nutricion-plan-status--${plan.status}`}>
            {formatNutricionPlanStatus(plan.status)}
          </span>
          {plan.access === "edit" && !isEditing ? (
            <button className="outline-action" type="button" onClick={onEdit}>
              <Pencil aria-hidden="true" />
              <span>Editar plan</span>
            </button>
          ) : null}
        </div>
      </header>

      <section className="nutricion-plan-overview" aria-label="Resumen del plan">
        <article>
          <ClipboardCheck aria-hidden="true" />
          <span>Inicio</span>
          <strong>{formatNutricionDate(plan.startDate)}</strong>
        </article>
        <article>
          <CalendarClock aria-hidden="true" />
          <span>Próximo control</span>
          <strong>{formatNutricionDate(plan.nextFollowUpDate)}</strong>
        </article>
        <article>
          <Utensils aria-hidden="true" />
          <span>Comidas definidas</span>
          <strong>{plan.meals.length}</strong>
        </article>
      </section>

      <div className="nutricion-plan-copy">
        <section>
          <h3>Valoración</h3>
          <p>{plan.assessment}</p>
        </section>
        <section>
          <h3>Recomendaciones</h3>
          <p>{plan.recommendations}</p>
        </section>
        {plan.restrictions !== null ? (
          <section>
            <h3>Restricciones y consideraciones</h3>
            <p>{plan.restrictions}</p>
          </section>
        ) : null}
      </div>

      <section className="nutricion-plan-meals" aria-labelledby="nutricion-plan-meals-title">
        <h3 id="nutricion-plan-meals-title">Plan por comidas</h3>
        <div>
          {plan.meals.map((meal) => (
            <article key={meal.id}>
              <h4>{formatNutricionMealSlot(meal.slot)}</h4>
              <p>{meal.instruction}</p>
              {meal.portion !== null || meal.frequency !== null ? (
                <small>
                  {[meal.portion, meal.frequency]
                    .filter((value): value is string => value !== null)
                    .join(" · ")}
                </small>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="nutricion-follow-ups" aria-labelledby="nutricion-follow-ups-title">
        <div className="nutricion-section-heading">
          <div>
            <p className="eyebrow">Seguimiento</p>
            <h3 id="nutricion-follow-ups-title">Controles nutricionales</h3>
          </div>
          <span>{plan.followUps.length} registrados</span>
        </div>

        {plan.followUps.length === 0 ? (
          <p className="nutricion-empty-note">Aún no hay seguimientos para este plan.</p>
        ) : (
          <ol className="nutricion-follow-up-timeline">
            {plan.followUps.map((followUp) => (
              <li key={followUp.id}>
                <span className="nutricion-follow-up-timeline__marker" aria-hidden="true">
                  <Scale />
                </span>
                <article>
                  <header>
                    <strong>{formatNutricionDate(followUp.followUpDate)}</strong>
                    <span>{formatNutricionAdherence(followUp.adherence)}</span>
                  </header>
                  <p>{followUp.progressNote}</p>
                  {followUp.adjustments !== null ? <p>Ajustes: {followUp.adjustments}</p> : null}
                  <dl>
                    {followUp.weightKg !== null ? (
                      <div>
                        <dt>Peso</dt>
                        <dd>{followUp.weightKg} kg</dd>
                      </div>
                    ) : null}
                    {followUp.bodyMassIndex !== null ? (
                      <div>
                        <dt>IMC</dt>
                        <dd>{followUp.bodyMassIndex}</dd>
                      </div>
                    ) : null}
                    {followUp.nextFollowUpDate !== null ? (
                      <div>
                        <dt>Próximo control</dt>
                        <dd>{formatNutricionDate(followUp.nextFollowUpDate)}</dd>
                      </div>
                    ) : null}
                  </dl>
                </article>
              </li>
            ))}
          </ol>
        )}
      </section>

      {canCreateFollowUp && plan.status === "active" ? (
        <NutricionFollowUpEditor plan={plan} onSaved={onFollowUpSaved} />
      ) : null}
    </div>
  );
}
