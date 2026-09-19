import {
  type AuthUser,
  type ReportsDashboardDailyPoint,
  type ReportsDashboardResponse,
  type ReportsDashboardQuery,
} from "@cuidarte/contracts";
import { Inject, Injectable } from "@nestjs/common";

import { assertCanUseReports, resolveReportTenantId } from "../domain/report.policy";
import {
  REPORTS_DASHBOARD_REPOSITORY,
  type ReportsDashboardRepository,
} from "../domain/reports-dashboard.repository";
import {
  type ReportsDashboardActivityTypeAggregate,
  type ReportsDashboardAggregate,
} from "../domain/reports-dashboard.types";

@Injectable()
export class ReportsDashboardService {
  constructor(
    @Inject(REPORTS_DASHBOARD_REPOSITORY)
    private readonly dashboardRepository: ReportsDashboardRepository,
  ) {}

  async getDashboard(
    query: ReportsDashboardQuery,
    actor: AuthUser,
  ): Promise<ReportsDashboardResponse> {
    assertCanUseReports(actor);

    const tenantId = actor.role === "super_admin" ? null : resolveReportTenantId(actor, null);
    const aggregate = await this.dashboardRepository.aggregate({
      ...query,
      scope: { tenantId },
    });
    const dailySeries = completeDailySeries(query, aggregate);
    const activitiesByType =
      tenantId === null
        ? consolidateActivitiesByType(aggregate.activitiesByType)
        : aggregate.activitiesByType;
    const activities = activitiesByType.reduce((total, item) => total + item.count, 0);

    return {
      range: query,
      scope: {
        tenantId,
        tenantName: aggregate.tenantName,
        isConsolidated: tenantId === null,
        municipality: aggregate.municipality ?? null,
        department: aggregate.department ?? null,
      },
      summary: {
        nursingAttendances: dailySeries.reduce(
          (total, point) => total + point.nursingAttendances,
          0,
        ),
        medicalAttendances: dailySeries.reduce(
          (total, point) => total + point.medicalAttendances,
          0,
        ),
        activities,
        transportAllowancesDelivered: dailySeries.reduce(
          (total, point) => total + point.transportAllowancesDelivered,
          0,
        ),
        snackOneDelivered: aggregate.snackOneDelivered,
        snackTwoDelivered: aggregate.snackTwoDelivered,
        snacksDelivered: dailySeries.reduce((total, point) => total + point.snacksDelivered, 0),
        lunchesDelivered: dailySeries.reduce((total, point) => total + point.lunchesDelivered, 0),
      },
      dailySeries,
      activitiesByType,
    };
  }
}

function consolidateActivitiesByType(
  activitiesByType: readonly ReportsDashboardActivityTypeAggregate[],
): ReportsDashboardActivityTypeAggregate[] {
  const activitiesByNormalizedName = new Map<string, ReportsDashboardActivityTypeAggregate>();

  for (const activity of activitiesByType) {
    const activityTypeName = activity.activityTypeName.trim();
    const normalizedName = activityTypeName.normalize("NFC").toLocaleLowerCase("es-CO");
    const existingActivity = activitiesByNormalizedName.get(normalizedName);

    if (existingActivity === undefined) {
      activitiesByNormalizedName.set(normalizedName, {
        ...activity,
        activityTypeName,
      });
      continue;
    }

    existingActivity.count += activity.count;
  }

  return [...activitiesByNormalizedName.values()].sort((left, right) =>
    left.activityTypeName.localeCompare(right.activityTypeName, "es-CO"),
  );
}

function completeDailySeries(
  query: ReportsDashboardQuery,
  aggregate: ReportsDashboardAggregate,
): ReportsDashboardDailyPoint[] {
  const pointsByDate = new Map(aggregate.dailySeries.map((point) => [point.date, point]));
  const points: ReportsDashboardDailyPoint[] = [];
  let currentDate = query.from;

  while (currentDate <= query.to) {
    points.push(
      pointsByDate.get(currentDate) ?? {
        date: currentDate,
        nursingAttendances: 0,
        medicalAttendances: 0,
        activities: 0,
        transportAllowancesDelivered: 0,
        snacksDelivered: 0,
        lunchesDelivered: 0,
      },
    );
    currentDate = addCalendarDay(currentDate);
  }

  return points;
}

function addCalendarDay(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);

  return date.toISOString().slice(0, 10);
}
