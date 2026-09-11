import { type ReportStatus } from "@cuidarte/contracts";

const ALLOWED_TRANSITIONS: Record<ReportStatus, readonly ReportStatus[]> = {
  pending: ["processing", "cancelled", "failed", "empty"],
  processing: ["ready", "empty", "failed", "cancelled"],
  ready: ["expired"],
  empty: [],
  failed: [],
  cancelled: [],
  expired: [],
};

export function assertReportStatusTransition(from: ReportStatus, to: ReportStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`Transicion invalida de reporte: ${from} -> ${to}`);
  }
}
