import { type TenantStatusFilter } from "@cuidarte/contracts";

export const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "Todos" },
  { value: "active", label: "Activos" },
  { value: "inactive", label: "Inactivos" },
] satisfies readonly { value: TenantStatusFilter; label: string }[];
