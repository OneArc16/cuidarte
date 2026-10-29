import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft, Plus } from "lucide-react";
import { useState } from "react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import { NutricionAdultoSummary } from "../components/nutricion-adulto-summary";
import { NutricionPlanDetailView } from "../components/nutricion-plan-detail";
import { NutricionPlanEditor } from "../components/nutricion-plan-editor";
import {
  formatNutricionDate,
  formatNutricionPlanStatus,
  resolveNutricionApiError,
} from "../lib/nutricion-formatters";
import { NUTRICION_PATH } from "../lib/nutricion-paths";
import { canCreateNutricion } from "../lib/nutricion-permissions";
import { useNutricionAdultoProfileQuery, useNutricionPlanQuery } from "../model/nutricion-queries";

type NutricionAdultoPageProps = {
  adultoMayorId: string;
  navigate: Navigate;
  user: AuthUser;
  view?: "history" | "profile";
};

export function NutricionAdultoPage({
  adultoMayorId,
  navigate,
  user,
  view = "profile",
}: NutricionAdultoPageProps) {
  const profileQuery = useNutricionAdultoProfileQuery(adultoMayorId);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const canCreate = canCreateNutricion(user);
  const isHistoryView = view === "history";
  const activePlanId =
    profileQuery.data?.plans.find((plan) => plan.status === "active")?.id ?? null;
  const displayedPlanId = selectedPlanId ?? activePlanId ?? profileQuery.data?.plans[0]?.id ?? null;
  const planQuery = useNutricionPlanQuery(displayedPlanId);

  if (profileQuery.isLoading) {
    return (
      <section className="nutricion-empty" aria-busy="true">
        <p>Cargando perfil nutricional...</p>
      </section>
    );
  }

  if (profileQuery.isError || profileQuery.data === undefined) {
    return (
      <section className="nutricion-empty">
        <p className="form-error" role="alert">
          {resolveNutricionApiError(profileQuery.error)}
        </p>
        <button className="outline-action" type="button" onClick={() => navigate(NUTRICION_PATH)}>
          <ChevronLeft aria-hidden="true" />
          <span>Volver a nutrición</span>
        </button>
      </section>
    );
  }

  const { adultoMayor, plans } = profileQuery.data;
  const plan = planQuery.data;
  const showPlanEditor = isCreatingPlan || (!isHistoryView && plans.length === 0 && canCreate);

  return (
    <section className="nutricion-stack nutricion-adulto-stack" aria-labelledby="nutricion-title">
      {isHistoryView ? (
        <>
          <h1 className="visually-hidden" id="nutricion-title">
            Historial nutricional del adulto mayor
          </h1>
          <div className="nutricion-attention-nav">
            <button
              className="outline-action"
              type="button"
              onClick={() => navigate(NUTRICION_PATH)}
            >
              <ChevronLeft aria-hidden="true" />
              <span>Volver</span>
            </button>
            <span className="nutricion-attention-nav__context">Historial nutricional</span>
          </div>
          <NutricionAdultoSummary adultoMayor={adultoMayor} />
        </>
      ) : (
        <header className="nutricion-adulto-header">
          <button
            className="nutricion-back-button"
            type="button"
            onClick={() => navigate(NUTRICION_PATH)}
          >
            <ChevronLeft aria-hidden="true" />
            <span>Nutrición</span>
          </button>
          <div>
            <p className="eyebrow">Plan personalizado</p>
            <h1 id="nutricion-title">{adultoMayor.fullName}</h1>
            <p>
              Documento {adultoMayor.documentNumber} · {adultoMayor.age} años ·{" "}
              {adultoMayor.tenantName}
            </p>
          </div>
          {canCreate && !isCreatingPlan ? (
            <button
              className="primary-action"
              type="button"
              onClick={() => {
                setIsCreatingPlan(true);
                setIsEditingPlan(false);
              }}
            >
              <Plus aria-hidden="true" />
              <span>Nuevo plan</span>
            </button>
          ) : null}
        </header>
      )}

      {plans.length > 0 ? (
        <nav className="nutricion-plan-tabs" aria-label="Historial de planes">
          {plans.map((item) => (
            <button
              className={item.id === displayedPlanId && !isCreatingPlan ? "is-active" : ""}
              key={item.id}
              type="button"
              onClick={() => {
                setSelectedPlanId(item.id);
                setIsCreatingPlan(false);
                setIsEditingPlan(false);
              }}
            >
              <span>{formatNutricionPlanStatus(item.status)}</span>
              <strong>{formatNutricionDate(item.startDate)}</strong>
            </button>
          ))}
        </nav>
      ) : null}

      {showPlanEditor ? (
        <NutricionPlanEditor
          adultoMayorId={adultoMayorId}
          onCancel={() => setIsCreatingPlan(false)}
          onSaved={(planId) => {
            setSelectedPlanId(planId);
            setIsCreatingPlan(false);
            setIsEditingPlan(false);
          }}
        />
      ) : planQuery.isLoading ? (
        <section className="nutricion-empty" aria-busy="true">
          <p>Cargando plan nutricional...</p>
        </section>
      ) : displayedPlanId === null ? (
        <section className="nutricion-empty">
          <p>Aún no hay un plan nutricional registrado para esta persona.</p>
        </section>
      ) : planQuery.isError || plan === undefined ? (
        <p className="form-error" role="alert">
          {resolveNutricionApiError(planQuery.error)}
        </p>
      ) : isEditingPlan ? (
        <NutricionPlanEditor
          adultoMayorId={adultoMayorId}
          plan={plan}
          onCancel={() => setIsEditingPlan(false)}
          onSaved={(planId) => {
            setSelectedPlanId(planId);
            setIsEditingPlan(false);
          }}
        />
      ) : (
        <NutricionPlanDetailView
          canCreateFollowUp={canCreate && plan.access === "edit"}
          isEditing={isEditingPlan}
          plan={plan}
          onEdit={() => setIsEditingPlan(true)}
          onFollowUpSaved={() => setSelectedPlanId(plan.id)}
        />
      )}
    </section>
  );
}
