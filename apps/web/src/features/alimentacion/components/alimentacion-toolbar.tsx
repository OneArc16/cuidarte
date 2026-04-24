import { type AlimentacionTenantOption } from "@cuidarte/contracts";
import { Search } from "lucide-react";

type AlimentacionToolbarProps = {
  deliveryDate: string;
  isTenantOptionsLoading: boolean;
  search: string;
  selectedTenantId: string;
  showTenantFilter: boolean;
  tenantOptions: AlimentacionTenantOption[];
  onDateChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onTenantChange: (value: string) => void;
};

export function AlimentacionToolbar({
  deliveryDate,
  isTenantOptionsLoading,
  search,
  selectedTenantId,
  showTenantFilter,
  tenantOptions,
  onDateChange,
  onSearchChange,
  onTenantChange,
}: AlimentacionToolbarProps) {
  return (
    <div className="alimentacion-toolbar">
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
        <span>Fecha</span>
        <input
          type="date"
          aria-label="Fecha"
          value={deliveryDate}
          onChange={(event) => onDateChange(event.target.value)}
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
