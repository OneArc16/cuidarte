import { type ReportsDashboardResponse } from "@cuidarte/contracts";
import { type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportDashboardChartsProps = {
  data: ReportsDashboardResponse;
  showMonthlyAttentionChart: boolean;
};

type MonthlyDelivery = {
  month: string;
  label: string;
  rationsDelivered: number;
  transportAllowancesDelivered: number;
};

type MonthlyAttention = {
  month: string;
  label: string;
  nursingAttendances: number;
  medicalAttendances: number;
};

type MonthlyDeliveryBreakdown = {
  month: string;
  label: string;
  snacksDelivered: number;
  lunchesDelivered: number;
  transportAllowancesDelivered: number;
};

type SexData = { label: string; total: number; color: string };

const tooltipStyle = {
  border: "1px solid #dce9e2",
  borderRadius: 8,
  background: "#fff",
  color: "#123b31",
};
const monthFormatter = new Intl.DateTimeFormat("es-CO", { month: "short", timeZone: "UTC" });
const chartGridColor = "#e6eee9";
const chartTickStyle = { fill: "#657a72", fontSize: 10 };
const wholeNumberFormatter = new Intl.NumberFormat("es-CO");

export function ReportDashboardCharts({
  data,
  showMonthlyAttentionChart,
}: ReportDashboardChartsProps) {
  const sexData = [
    { label: "Hombres", total: data.sexDistribution.male, color: "#2b6b99" },
    { label: "Mujeres", total: data.sexDistribution.female, color: "#168362" },
    { label: "Otro", total: data.sexDistribution.other, color: "#70549a" },
  ].filter((item) => item.total > 0);
  const totalPeople = sexData.reduce((total, item) => total + item.total, 0);
  const activityData = data.activitiesByType
    .filter((activity) => activity.count > 0)
    .map((activity) => ({ label: activity.activityTypeName, total: activity.count }));
  const monthlyData = buildMonthlyDeliveries(data.dailySeries);
  const monthlyAttentionData = buildMonthlyAttendances(data.dailySeries);
  const monthlyDeliveryBreakdownData = buildMonthlyDeliveryBreakdown(data.dailySeries);

  return (
    <section className="reports-charts" aria-labelledby="reports-charts-title">
      <div className="reports-dashboard__heading">
        <div>
          <p className="eyebrow">Lectura del periodo</p>
          <h2 id="reports-charts-title">Tendencias y distribución</h2>
        </div>
      </div>
      <div className="reports-chart-grid">
        {showMonthlyAttentionChart ? (
          <ChartPanel
            title="Atenciones por mes"
            description="Comparación mensual de enfermería y medicina."
            className="reports-chart-panel--bar-hover"
          >
            <ResponsiveContainer width="100%" height={260}>
              <BarChart
                data={monthlyAttentionData}
                margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
                barGap={6}
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
                  tickLine={false}
                  axisLine={false}
                  width={28}
                />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgb(22 131 98 / 7%)" }} />
                <Legend
                  align="left"
                  verticalAlign="top"
                  iconType="square"
                  iconSize={10}
                  wrapperStyle={{ paddingLeft: 4, paddingBottom: 8, fontSize: 12 }}
                />
                <Bar
                  dataKey="nursingAttendances"
                  name="Enfermería"
                  fill="#168362"
                  maxBarSize={32}
                  radius={[4, 4, 0, 0]}
                />
                <Bar
                  dataKey="medicalAttendances"
                  name="Medicina"
                  fill="#2b6b99"
                  maxBarSize={32}
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
            <AccessibleTable
              caption="Atenciones por mes"
              headers={["Mes", "Enfermería", "Medicina"]}
              rows={monthlyAttentionData.map((point) => [
                point.month,
                point.nursingAttendances,
                point.medicalAttendances,
              ])}
            />
          </ChartPanel>
        ) : null}

        {activityData.length > 0 ? (
          <ChartPanel
            title="Actividades por tipo"
            description="Sesiones grupales registradas en el periodo."
            className="reports-analytics-chart reports-analytics-chart--activities"
          >
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={activityData} margin={{ top: 22, right: 6, left: -22, bottom: 30 }}>
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
                <Tooltip contentStyle={tooltipStyle} cursor={false} />
                <Bar
                  dataKey="total"
                  name="Actividades"
                  fill="#b47a25"
                  maxBarSize={48}
                  radius={[4, 4, 0, 0]}
                >
                  <LabelList
                    dataKey="total"
                    position="top"
                    fill="#845116"
                    fontSize={11}
                    fontWeight={800}
                    formatter={formatNonZeroCompactValue}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <AccessibleTable
              caption="Actividades por tipo"
              headers={["Tipo", "Cantidad"]}
              rows={activityData.map((activity) => [activity.label, activity.total])}
            />
          </ChartPanel>
        ) : null}

        <ChartPanel
          title="Entregas por mes"
          description="Transporte, refrigerios y almuerzos entregados."
          className="reports-chart-panel--deliveries reports-chart-panel--bar-hover"
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={monthlyDeliveryBreakdownData}
              margin={{ top: 8, right: 12, left: 0, bottom: 4 }}
              barGap={6}
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
                tickLine={false}
                axisLine={false}
                width={40}
              />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "rgb(22 131 98 / 7%)" }} />
              <Legend
                align="left"
                verticalAlign="top"
                iconType="square"
                iconSize={10}
                wrapperStyle={{ paddingLeft: 4, paddingBottom: 8, fontSize: 12 }}
              />
              <Bar
                dataKey="transportAllowancesDelivered"
                name="Transporte"
                fill="#a24b48"
                maxBarSize={32}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="snacksDelivered"
                name="Refrigerios"
                fill="#70549a"
                maxBarSize={32}
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="lunchesDelivered"
                name="Almuerzos"
                fill="#4d7b38"
                maxBarSize={32}
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <AccessibleTable
            caption="Entregas por mes"
            headers={["Mes", "Transporte", "Refrigerios", "Almuerzos"]}
            rows={monthlyDeliveryBreakdownData.map((point) => [
              point.month,
              point.transportAllowancesDelivered,
              point.snacksDelivered,
              point.lunchesDelivered,
            ])}
          />
        </ChartPanel>

        <ChartPanel
          title="Personas por sexo"
          description="Distribución de personas registradas."
          className="reports-analytics-chart reports-chart-panel--compact"
        >
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
          <AccessibleTable
            caption="Personas por sexo"
            headers={["Sexo", "Personas"]}
            rows={sexData.map((item) => [item.label, item.total])}
          />
        </ChartPanel>

        <ChartPanel
          title="Almuerzos y refrigerios entregados mes"
          description="Total de refrigerios y almuerzos entregados."
          className="reports-analytics-chart reports-chart-panel--compact"
        >
          <ResponsiveContainer width="100%" height={205}>
            <BarChart data={monthlyData} margin={{ top: 22, right: 2, left: 4, bottom: 0 }}>
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
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Bar
                dataKey="rationsDelivered"
                name="Raciones"
                fill="#70549a"
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="rationsDelivered"
                  position="top"
                  fill="#70549a"
                  fontSize={10}
                  formatter={formatNonZeroCompactValue}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <AccessibleTable
            caption="Raciones entregadas por mes"
            headers={["Mes", "Raciones"]}
            rows={monthlyData.map((point) => [point.month, point.rationsDelivered])}
          />
        </ChartPanel>

        <ChartPanel
          title="Auxilios de transporte por mes"
          description="Auxilios entregados durante el periodo."
          className="reports-analytics-chart reports-chart-panel--compact"
        >
          <ResponsiveContainer width="100%" height={205}>
            <BarChart data={monthlyData} margin={{ top: 22, right: 2, left: 4, bottom: 0 }}>
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
              <Tooltip contentStyle={tooltipStyle} cursor={false} />
              <Bar
                dataKey="transportAllowancesDelivered"
                name="Auxilios"
                fill="#a24b48"
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
              >
                <LabelList
                  dataKey="transportAllowancesDelivered"
                  position="top"
                  fill="#a24b48"
                  fontSize={10}
                  formatter={formatNonZeroCompactValue}
                />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <AccessibleTable
            caption="Auxilios de transporte por mes"
            headers={["Mes", "Auxilios"]}
            rows={monthlyData.map((point) => [point.month, point.transportAllowancesDelivered])}
          />
        </ChartPanel>
      </div>
    </section>
  );
}

function ChartPanel({
  title,
  description,
  className,
  children,
}: {
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article className={`reports-chart-panel ${className ?? ""}`}>
      <div className="reports-chart-panel__header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="reports-chart-panel__canvas">{children}</div>
    </article>
  );
}

function SexLegend({ data }: { data: SexData[] }) {
  return (
    <div className="reports-analytics-chart__legend" aria-label="Distribución por sexo">
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
          fill="#657a72"
          fontSize={10}
          textAnchor="middle"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

function AccessibleTable({
  caption,
  headers,
  rows,
}: {
  caption: string;
  headers: string[];
  rows: Array<Array<string | number>>;
}) {
  return (
    <table className="visually-hidden">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {headers.map((header) => (
            <th key={header} scope="col">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, index) => (
          <tr key={`${caption}-${index}`}>
            {row.map((value, cellIndex) =>
              cellIndex === 0 ? (
                <th scope="row" key={`${index}-${cellIndex}`}>
                  {value}
                </th>
              ) : (
                <td key={`${index}-${cellIndex}`}>{value}</td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function buildMonthlyDeliveries(
  dailySeries: ReportsDashboardResponse["dailySeries"],
): MonthlyDelivery[] {
  const byMonth = new Map<string, Omit<MonthlyDelivery, "month" | "label">>();

  for (const point of dailySeries) {
    const month = point.date.slice(0, 7);
    const existing = byMonth.get(month) ?? {
      rationsDelivered: 0,
      transportAllowancesDelivered: 0,
    };
    existing.rationsDelivered += point.snacksDelivered + point.lunchesDelivered;
    existing.transportAllowancesDelivered += point.transportAllowancesDelivered;
    byMonth.set(month, existing);
  }

  return [...byMonth.entries()].map(([month, delivery]) => ({
    month,
    label: monthFormatter.format(new Date(`${month}-01T00:00:00Z`)),
    ...delivery,
  }));
}

function buildMonthlyAttendances(
  dailySeries: ReportsDashboardResponse["dailySeries"],
): MonthlyAttention[] {
  const byMonth = new Map<string, Omit<MonthlyAttention, "month" | "label">>();

  for (const point of dailySeries) {
    const month = point.date.slice(0, 7);
    const existing = byMonth.get(month) ?? { nursingAttendances: 0, medicalAttendances: 0 };
    existing.nursingAttendances += point.nursingAttendances;
    existing.medicalAttendances += point.medicalAttendances;
    byMonth.set(month, existing);
  }

  return [...byMonth.entries()].map(([month, attendance]) => ({
    month,
    label: monthFormatter.format(new Date(`${month}-01T00:00:00Z`)),
    ...attendance,
  }));
}

function buildMonthlyDeliveryBreakdown(
  dailySeries: ReportsDashboardResponse["dailySeries"],
): MonthlyDeliveryBreakdown[] {
  const byMonth = new Map<string, Omit<MonthlyDeliveryBreakdown, "month" | "label">>();

  for (const point of dailySeries) {
    const month = point.date.slice(0, 7);
    const existing = byMonth.get(month) ?? {
      snacksDelivered: 0,
      lunchesDelivered: 0,
      transportAllowancesDelivered: 0,
    };
    existing.snacksDelivered += point.snacksDelivered;
    existing.lunchesDelivered += point.lunchesDelivered;
    existing.transportAllowancesDelivered += point.transportAllowancesDelivered;
    byMonth.set(month, existing);
  }

  return [...byMonth.entries()].map(([month, delivery]) => ({
    month,
    label: monthFormatter.format(new Date(`${month}-01T00:00:00Z`)),
    ...delivery,
  }));
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
    return `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value / 1_000)}k`;
  }

  return String(value);
}

function formatNonZeroCompactValue(value: unknown): string {
  const numericValue = typeof value === "number" || typeof value === "string" ? Number(value) : 0;

  return numericValue > 0 ? formatCompactValue(numericValue) : "";
}
