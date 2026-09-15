import {
  Activity,
  Apple,
  ClipboardPlus,
  HeartPulse,
  Salad,
  Stethoscope,
  Truck,
  Utensils,
} from "lucide-react";
import { type ReactNode } from "react";
import { type ReportsDashboardResponse } from "@cuidarte/contracts";

import { ReportDashboardCharts } from "./report-dashboard-charts";

type ReportDashboardProps = {
  data: ReportsDashboardResponse | undefined;
  isLoading: boolean;
  isError: boolean;
};

const METRICS = [
  { key: "nursingAttendances", label: "Atenciones por enfermería", icon: HeartPulse, tone: "mint" },
  { key: "medicalAttendances", label: "Atenciones por médico", icon: Stethoscope, tone: "blue" },
  { key: "activities", label: "Actividades realizadas", icon: Activity, tone: "amber" },
  {
    key: "transportAllowancesDelivered",
    label: "Auxilios de transporte",
    icon: Truck,
    tone: "rose",
  },
  { key: "snacksDelivered", label: "Refrigerios entregados", icon: Apple, tone: "violet" },
  { key: "snackOneDelivered", label: "Refrigerio 1", icon: ClipboardPlus, tone: "blue" },
  { key: "snackTwoDelivered", label: "Refrigerio 2", icon: Salad, tone: "mint" },
  { key: "lunchesDelivered", label: "Almuerzos entregados", icon: Utensils, tone: "green" },
] as const;

export function ReportDashboard({ data, isLoading, isError }: ReportDashboardProps) {
  return (
    <>
      <section className="reports-dashboard" aria-labelledby="reports-dashboard-title">
        <div className="reports-dashboard__heading">
          <div>
            <p className="eyebrow">Resumen operativo</p>
            <h2 id="reports-dashboard-title">Estadísticas del periodo</h2>
          </div>
          {data?.scope.isConsolidated ? (
            <span className="reports-scope-badge">Todos los centros</span>
          ) : null}
        </div>
        {isLoading ? <p className="reports-dashboard__state">Cargando estadísticas...</p> : null}
        {isError ? (
          <p className="reports-dashboard__state reports-dashboard__state--error">
            No fue posible cargar las estadísticas.
          </p>
        ) : null}
        {!isLoading && !isError && data ? (
          <>
            <div className="reports-metric-grid">
              {METRICS.map((metric) => {
                const Icon = metric.icon;
                return (
                  <article className="reports-metric" key={metric.key}>
                    <span className={`reports-metric__icon reports-metric__icon--${metric.tone}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <div>
                      <span>{metric.label}</span>
                      <strong>{data.summary[metric.key]}</strong>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        ) : null}
        {data && !isLoading && !isError ? <ReportDashboardCharts data={data} /> : null}
      </section>
    </>
  );
}
