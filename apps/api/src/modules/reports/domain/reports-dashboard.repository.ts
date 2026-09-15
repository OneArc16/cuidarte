import {
  type ReportsDashboardAggregate,
  type ReportsDashboardQuery,
  type ReportsDashboardScope,
} from "./reports-dashboard.types";

export const REPORTS_DASHBOARD_REPOSITORY = Symbol("REPORTS_DASHBOARD_REPOSITORY");

export type ReportsDashboardRepository = {
  aggregate(
    query: ReportsDashboardQuery & { scope: ReportsDashboardScope },
  ): Promise<ReportsDashboardAggregate>;
};
