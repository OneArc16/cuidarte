import { type HomeDashboardAnalytics } from "@cuidarte/contracts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = { analytics: HomeDashboardAnalytics };

const tooltipStyle = {
  border: "1px solid #d8c8ee",
  borderRadius: 8,
  background: "#fff",
  color: "#321457",
};
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short" });

export function HomeAuditorCharts({ analytics }: Props) {
  const sexData = [
    { label: "Mujeres", total: analytics.sexDistribution.female, color: "#6416b8" },
    { label: "Hombres", total: analytics.sexDistribution.male, color: "#0ca6b7" },
  ];
  const monthlyData = analytics.monthlyDeliveries.map((point) => ({
    ...point,
    label: monthFormatter.format(new Date(`${point.month}-01T00:00:00Z`)),
  }));

  return (
    <section className="home-auditor-charts" aria-labelledby="auditor-charts-title">
      <header>
        <span id="auditor-charts-title" className="eyebrow">
          Análisis
        </span>
      </header>
      <div className="home-auditor-charts__grid">
        <Chart title="Personas por sexo">
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={sexData}
                dataKey="total"
                nameKey="label"
                innerRadius={54}
                outerRadius={82}
                paddingAngle={3}
              >
                {sexData.map((item) => (
                  <Cell key={item.label} fill={item.color} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </Chart>
        {analytics.activitiesByType.length > 0 ? (
          <Chart title="Actividades por tipo">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart
                data={analytics.activitiesByType}
                margin={{ top: 8, right: 8, left: -18, bottom: 34 }}
              >
                <defs>
                  <linearGradient id="auditor-activity-gradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f5bd22" />
                    <stop offset="48%" stopColor="#86bf3f" />
                    <stop offset="100%" stopColor="#0ca6b7" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#eee8f5" strokeDasharray="3 3" />
                <XAxis
                  dataKey="label"
                  interval={0}
                  angle={-32}
                  textAnchor="end"
                  tick={{ fill: "#705c84", fontSize: 10 }}
                />
                <YAxis allowDecimals={false} tick={{ fill: "#705c84", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="total"
                  name="Actividades"
                  fill="url(#auditor-activity-gradient)"
                  radius={[5, 5, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        ) : null}
        <Chart title="Raciones entregadas por mes">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid stroke="#eee8f5" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#705c84", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#705c84", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="rationsDelivered"
                name="Raciones"
                stroke="#6416b8"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Auxilios de transporte por mes">
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={monthlyData} margin={{ top: 8, right: 8, left: -18, bottom: 4 }}>
              <CartesianGrid stroke="#eee8f5" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#705c84", fontSize: 10 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#705c84", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line
                type="monotone"
                dataKey="transportAllowancesDelivered"
                name="Auxilios"
                stroke="#0ca6b7"
                strokeWidth={3}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Chart>
      </div>
    </section>
  );
}

function Chart({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="home-auditor-chart">
      <h3>{title}</h3>
      {children}
    </article>
  );
}
