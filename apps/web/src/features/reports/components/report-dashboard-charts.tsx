import { type ReportsDashboardResponse } from "@cuidarte/contracts";
import { type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ReportDashboardChartsProps = {
  data: ReportsDashboardResponse;
};

export function ReportDashboardCharts({ data }: ReportDashboardChartsProps) {
  const dailyData = data.dailySeries.map((point) => ({
    ...point,
    label: formatChartDate(point.date),
  }));
  const activityData = data.activitiesByType.map((activity) => ({
    ...activity,
    label: activity.activityTypeName,
  }));

  return (
    <section className="reports-charts" aria-labelledby="reports-charts-title">
      <div className="reports-dashboard__heading">
        <div>
          <p className="eyebrow">Lectura del periodo</p>
          <h2 id="reports-charts-title">Tendencias y distribución</h2>
        </div>
      </div>
      <div className="reports-chart-grid">
        <ChartPanel
          title="Atenciones por día"
          description="Comparación diaria de enfermería y medicina."
        >
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={dailyData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#e6eee9" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#657a72", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#657a72", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Line
                type="monotone"
                dataKey="nursingAttendances"
                name="Enfermería"
                stroke="#168362"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="medicalAttendances"
                name="Medicina"
                stroke="#2b6b99"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
          <AccessibleTable
            caption="Atenciones por día"
            headers={["Fecha", "Enfermería", "Medicina"]}
            rows={dailyData.map((point) => [
              point.date,
              point.nursingAttendances,
              point.medicalAttendances,
            ])}
          />
        </ChartPanel>

        <ChartPanel
          title="Actividades por tipo"
          description="Sesiones grupales registradas en el periodo."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={activityData}
              layout="vertical"
              margin={{ top: 8, right: 18, left: 12, bottom: 4 }}
            >
              <CartesianGrid stroke="#e6eee9" strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} tick={{ fill: "#657a72", fontSize: 11 }} />
              <YAxis
                type="category"
                dataKey="label"
                width={105}
                tick={{ fill: "#657a72", fontSize: 10 }}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" name="Actividades" fill="#b47a25" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <AccessibleTable
            caption="Actividades por tipo"
            headers={["Tipo", "Cantidad"]}
            rows={activityData.map((activity) => [activity.activityTypeName, activity.count])}
          />
        </ChartPanel>

        <ChartPanel
          title="Entregas por día"
          description="Transporte, refrigerios y almuerzos entregados."
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={dailyData} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
              <CartesianGrid stroke="#e6eee9" strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fill: "#657a72", fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fill: "#657a72", fontSize: 11 }} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend />
              <Bar
                dataKey="transportAllowancesDelivered"
                name="Transporte"
                fill="#a24b48"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="snacksDelivered"
                name="Refrigerios"
                fill="#70549a"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="lunchesDelivered"
                name="Almuerzos"
                fill="#4d7b38"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
          <AccessibleTable
            caption="Entregas por día"
            headers={["Fecha", "Transporte", "Refrigerios", "Almuerzos"]}
            rows={dailyData.map((point) => [
              point.date,
              point.transportAllowancesDelivered,
              point.snacksDelivered,
              point.lunchesDelivered,
            ])}
          />
        </ChartPanel>
      </div>
    </section>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <article className="reports-chart-panel">
      <div className="reports-chart-panel__header">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="reports-chart-panel__canvas">{children}</div>
    </article>
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

const tooltipStyle = {
  border: "1px solid #dce9e2",
  borderRadius: 8,
  background: "#ffffff",
  color: "#123b31",
};

function formatChartDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}
