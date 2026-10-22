import {
  hasUserPermission,
  type AuthUser,
  type ReportDashboardChartPermission,
} from "@cuidarte/contracts";

export function canOpenReports(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" ||
        user.role === "admin" ||
        user.role === "auditor" ||
        user.role === "director"
    : hasUserPermission(user, "reportes.view");
}

export function canExportReports(user: Pick<AuthUser, "role" | "permissions">): boolean {
  return user.permissions === undefined
    ? user.role === "super_admin" || user.role === "admin" || user.role === "director"
    : hasUserPermission(user, "reportes.export");
}

export function canViewReportChart(
  user: Pick<AuthUser, "role" | "permissions">,
  chart: ReportDashboardChartPermission,
): boolean {
  if (user.permissions === undefined) {
    return chart !== "reportes.chart.monthly_attendances" || user.role !== "auditor";
  }

  return hasUserPermission(user, chart);
}
