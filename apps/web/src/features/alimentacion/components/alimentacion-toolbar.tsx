import { type AlimentacionTenantOption } from "@cuidarte/contracts";
import { Search } from "lucide-react";

type AlimentacionToolbarProps = {
  deliveryMonth: string;
  isTenantOptionsLoading: boolean;
  search: string;
  selectedTenantId: string;
  showTenantFilter: boolean;
  tenantOptions: AlimentacionTenantOption[];
  onMonthChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onTenantChange: (value: string) => void;
};

export function AlimentacionToolbar({
  deliveryMonth,
  isTenantOptionsLoading,
  search,
  selectedTenantId,
  showTenantFilter,
  tenantOptions,
  onMonthChange,
  onSearchChange,
  onTenantChange,
}: AlimentacionToolbarProps) {
  return (
    <div
      className={`alimentacion-toolbar ${
        showTenantFilter ? "alimentacion-toolbar--with-tenant" : "alimentacion-toolbar--without-tenant"
      }`}
    >
      <label className="alimentacion-search">
        <span>Buscar</span>
        <div className="alimentacion-search__control">
          <Search aria-hidden="true" />
          <input
            type="search"
            aria-label="Buscar por nombre o documento"
            placeholder="Buscar por nombre o documento"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>

      <label className="alimentacion-filter">
        <span>Mes</span>
        <input
          type="month"
          aria-label="Mes"
          value={deliveryMonth}
          onChange={(event) => onMonthChange(event.target.value)}
        />
      </label>

      {showTenantFilter ? (
        <label className="alimentacion-filter">
          <span>Centro</span>
          <select
            aria-label="Centro"
            disabled={isTenantOptionsLoading}
            value={selectedTenantId}
            onChange={(event) => onTenantChange(event.target.value)}
          >
            <option value="">Todos</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
