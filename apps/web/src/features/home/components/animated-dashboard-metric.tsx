import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "motion/react";

import { formatDashboardMetricValue } from "../lib/home-formatters";

type AnimatedDashboardMetricProps = {
  value: number | null | undefined;
};

const COUNT_UP_DURATION_MS = 720;

export function AnimatedDashboardMetric({ value }: AnimatedDashboardMetricProps) {
  const shouldReduceMotion = useReducedMotion();
  const [displayedValue, setDisplayedValue] = useState<number | null | undefined>(() =>
    shouldReduceMotion || value === null || value === undefined ? value : 0,
  );
  const frameIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (frameIdRef.current !== null) {
      cancelAnimationFrame(frameIdRef.current);
    }

    if (value === null || value === undefined || shouldReduceMotion || value === 0) {
      setDisplayedValue(value);
      return;
    }

    setDisplayedValue(0);
    const startedAt = performance.now();
    const updateValue = (timestamp: number) => {
      const progress = Math.min((timestamp - startedAt) / COUNT_UP_DURATION_MS, 1);
      const easedProgress = 1 - (1 - progress) ** 3;
      setDisplayedValue(Math.round(value * easedProgress));

      if (progress < 1) {
        frameIdRef.current = requestAnimationFrame(updateValue);
      }
    };

    frameIdRef.current = requestAnimationFrame(updateValue);

    return () => {
      if (frameIdRef.current !== null) {
        cancelAnimationFrame(frameIdRef.current);
      }
    };
  }, [shouldReduceMotion, value]);

  return <>{formatDashboardMetricValue(displayedValue)}</>;
}
