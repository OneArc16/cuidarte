import { AnimatedNumber } from "@/components/animated-number";

import { formatDashboardMetricValue } from "../lib/home-formatters";

type AnimatedDashboardMetricProps = {
  value: number | null | undefined;
};

export function AnimatedDashboardMetric({ value }: AnimatedDashboardMetricProps) {
  return <AnimatedNumber value={value} formatValue={formatDashboardMetricValue} />;
}
