export type ReportsDashboardQuery = {
  from: string;
  to: string;
};

export type ReportsDashboardScope = {
  tenantId: string | null;
};

export type ReportsDashboardDailyAggregate = {
  date: string;
  nursingAttendances: number;
  medicalAttendances: number;
  activities: number;
  transportAllowancesDelivered: number;
  snacksDelivered: number;
  lunchesDelivered: number;
};

export type ReportsDashboardActivityTypeAggregate = {
  activityTypeId: string;
  activityTypeName: string;
  count: number;
};

export type ReportsDashboardAggregate = {
  tenantName: string | null;
  municipality?: string | null;
  department?: string | null;
  dailySeries: ReportsDashboardDailyAggregate[];
  activitiesByType: ReportsDashboardActivityTypeAggregate[];
  snackOneDelivered: number;
  snackTwoDelivered: number;
};
