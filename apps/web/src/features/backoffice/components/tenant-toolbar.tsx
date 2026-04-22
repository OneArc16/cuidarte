import { type TenantStatusFilter } from "@cuidarte/contracts";

import { STATUS_FILTER_OPTIONS } from "../lib/tenant-filters";

type TenantToolbarProps = {
  search: string;
  status: TenantStatusFilter;
  onSearchChange: (search: string) => void;
  onStatusChange: (status: TenantStatusFilter) => void;
};

export function TenantToolbar({
  search,
  status,
  onSearchChange,
  onStatusChange,
}: TenantToolbarProps) {
  return (
    <section className="backoffice-toolbar" aria-label="Filtros de tenants">
      <label className="search-field">
        <span>Buscar</span>
        <input
          value={search}
          type="search"
          aria-label="Buscar tenant"
          onChange={(event) => onSearchChange(event.currentTarget.value)}
        />
      </label>

      <div className="status-segment" aria-label="Estado">
        {STATUS_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </section>
  );
}
