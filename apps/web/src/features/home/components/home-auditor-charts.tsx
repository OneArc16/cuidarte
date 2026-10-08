import { type HomeDashboardAnalytics } from "@cuidarte/contracts";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type Props = { analytics: HomeDashboardAnalytics };
type SexData = { label: string; total: number; color: string };

const tooltipStyle = {
  border: "1px solid #d8c8ee",
  borderRadius: 8,
  background: "#fff",
  color: "#321457",
};
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });
const chartGridColor = "#eee8f5";
const chartTickStyle = { fill: "#705c84", fontSize: 10 };
const wholeNumberFormatter = new Intl.NumberFormat("es-CO");

export function HomeAuditorCharts({ analytics }: Props) {
  const sexData = [
    { label: "Hombres", total: analytics.sexDistribution.male, color: "#0ca6b7" },
    { label: "Mujeres", total: analytics.sexDistribution.female, color: "#6416b8" },
  ];
  const totalPeople = sexData.reduce((total, item) => total + item.total, 0);
  const monthlyData = analytics.monthlyDeliveries.map((point) => ({
    ...point,
    label: monthFormatter.format(new Date(`${point.month}-01T00:00:00Z`)),
  }));
  const monthlyRationsData = monthlyData.filter((point) => point.rationsDelivered > 0);
  const monthlyTransportData = monthlyData.filter(
    (point) => point.transportAllowancesDelivered > 0,
  );

  return (
    <section className="home-auditor-charts" aria-labelledby="auditor-charts-title">
      <header>
        <span id="auditor-charts-title" className="eyebrow">
          Análisis
        </span>
      </header>
      <div className="home-auditor-charts__grid">
        <Chart title="Personas por sexo" variant="sex">
          <ResponsiveContainer width="100%" height={210}>
            <PieChart>
              <Pie
                data={sexData}
                dataKey="total"
                nameKey="label"
                innerRadius={52}
                outerRadius={80}
                paddingAngle={3}
              >
                {sexData.map((item) => (
                  <Cell key={item.label} fill={item.color} />
                ))}
              </Pie>
              <Tooltip content={<SexTooltip totalPeople={totalPeople} />} cursor={false} />
            </PieChart>
          </ResponsiveContainer>
          <SexLegend data={sexData} />
        </Chart>
        {analytics.activitiesByType.length > 0 ? (
          <Chart title="Actividades por tipo" variant="activities">
            <ResponsiveContainer width="100%" height={210}>
              <BarChart
                data={analytics.activitiesByType}
                margin={{ top: 22, right: 6, left: -22, bottom: 30 }}
              >
                <defs>
                  <linearGradient id="auditor-activity-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5bd22" />
                    <stop offset="48%" stopColor="#86bf3f" />
                    <stop offset="100%" stopColor="#0ca6b7" />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={chartGridColor} vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={0}
                  tick={<ActivityTypeTick />}
                  tickLine={false}
                  axisLine={{ stroke: chartGridColor }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={chartTickStyle}
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="total"
                  name="Actividades"
                  fill="url(#auditor-activity-gradient)"
                  maxBarSize={48}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="total"
                    position="top"
                    fill="#461078"
                    fontSize={11}
                    fontWeight={800}
                    formatter={formatNonZeroCompactValue}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Chart>
        ) : null}
        <Chart title="Almuerzos y refrigerios entregados mes" variant="monthly">
          <ResponsiveContainer width="100%" height={205}>
            <BarChart data={monthlyRationsData} margin={{ top: 22, right: 2, left: 4, bottom: 0 }}>
              <CartesianGrid stroke={chartGridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={chartTickStyle}
                tickLine={false}
                axisLine={{ stroke: chartGridColor }}
              />
              <YAxis
                allowDecimals={false}
                tick={chartTickStyle}
                tickFormatter={formatCompactValue}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="rationsDelivered"
                name="Raciones"
                fill="#6416b8"
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="rationsDelivered"
                  position="top"
                  fill="#644481"
                  fontSize={10}
                  formatter={formatNonZeroCompactValue}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Chart>
        <Chart title="Auxilios de transporte por mes" variant="monthly">
          <ResponsiveContainer width="100%" height={205}>
            <BarChart
              data={monthlyTransportData}
              margin={{ top: 22, right: 2, left: 4, bottom: 0 }}
            >
              <CartesianGrid stroke={chartGridColor} vertical={false} />
              <XAxis
                dataKey="label"
                tick={chartTickStyle}
                tickLine={false}
                axisLine={{ stroke: chartGridColor }}
              />
              <YAxis
                allowDecimals={false}
                tick={chartTickStyle}
                tickFormatter={formatCompactValue}
                tickLine={false}
                axisLine={false}
                width={42}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="transportAllowancesDelivered"
                name="Auxilios"
                fill="#0ca6b7"
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="transportAllowancesDelivered"
                  position="top"
                  fill="#176d7a"
                  fontSize={10}
                  formatter={formatNonZeroCompactValue}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Chart>
      </div>
    </section>
  );
}

function Chart({
  title,
  variant,
  children,
}: {
  title: string;
  variant: "sex" | "activities" | "monthly";
  children: React.ReactNode;
}) {
  return (
    <article className={`home-auditor-chart home-auditor-chart--${variant}`}>
      <h3>{title}</h3>
      {children}
    </article>
  );
}

function SexLegend({ data }: { data: SexData[] }) {
  return (
    <div className="home-auditor-chart__legend" aria-label="Distribución por sexo">
      {data.map((item) => {
        return (
          <span key={item.label}>
            <i style={{ background: item.color }} aria-hidden="true" />
            {item.label} {wholeNumberFormatter.format(item.total)}
          </span>
        );
      })}
    </div>
  );
}

function SexTooltip({
  active,
  payload,
  totalPeople,
}: {
  active?: boolean;
  payload?: Array<{ payload?: SexData }>;
  totalPeople: number;
}) {
  const item = payload?.[0]?.payload;
  if (!active || item === undefined) return null;

  const percentage = totalPeople === 0 ? 0 : Math.round((item.total / totalPeople) * 100);

  return (
    <div style={{ ...tooltipStyle, padding: "8px 10px", fontSize: "0.78rem" }}>
      <strong>{item.label}</strong>
      <br />
      {wholeNumberFormatter.format(item.total)} personas · {percentage}%
    </div>
  );
}

function ActivityTypeTick({
  x = 0,
  y = 0,
  payload,
}: {
  x?: number;
  y?: number;
  payload?: { value?: string };
}) {
  const lines = wrapLabel(payload?.value ?? "", 14);

  return (
    <g transform={`translate(${x},${y})`}>
      {lines.map((line, index) => (
        <text
          key={`${line}-${index}`}
          x={0}
          y={14 + index * 11}
          fill="#705c84"
          fontSize={10}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function wrapLabel(value: string, maxLength: number): string[] {
  const words = value.split(" ");
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const nextLine = currentLine === "" ? word : `${currentLine} ${word}`;
    if (nextLine.length <= maxLength || currentLine === "") {
      currentLine = nextLine;
      continue;
    }

    lines.push(currentLine);
    currentLine = word;
  }

  if (currentLine !== "") {
    lines.push(currentLine);
  }

  return lines.slice(0, 2);
}

function formatCompactValue(value: number): string {
  if (value >= 1_000) {
    return `${new Intl.NumberFormat("es-CO", {
      maximumFractionDigits: 1,
    }).format(value / 1_000)}k`;
  }

  return String(value);
}

function formatNonZeroCompactValue(value: unknown): string {
  const numericValue = typeof value === "number" || typeof value === "string" ? Number(value) : 0;

  return numericValue > 0 ? formatCompactValue(numericValue) : "";
}
