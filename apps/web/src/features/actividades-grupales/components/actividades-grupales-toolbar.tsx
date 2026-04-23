import { Search } from "lucide-react";
import { type ActividadGrupalTenantOption, type ActividadGrupalType } from "@cuidarte/contracts";

import {
  formatActividadGrupalType,
  getActividadGrupalTypeOptions,
} from "../lib/actividades-grupales-formatters";

type ActividadesGrupalesToolbarProps = {
  selectedActivityType: ActividadGrupalType | "";
  search: string;
  selectedTenantId: string;
  showTenantFilter: boolean;
  tenantOptions: ActividadGrupalTenantOption[];
  isTenantOptionsLoading: boolean;
  onActivityTypeChange: (activityType: ActividadGrupalType | "") => void;
  onSearchChange: (search: string) => void;
  onTenantChange: (tenantId: string) => void;
};

export function ActividadesGrupalesToolbar({
  isTenantOptionsLoading,
  onActivityTypeChange,
  onSearchChange,
  onTenantChange,
  search,
  selectedActivityType,
  selectedTenantId,
  showTenantFilter,
  tenantOptions,
}: ActividadesGrupalesToolbarProps) {
  return (
    <section className="actividades-toolbar" aria-label="Herramientas del listado">
      <label className="actividades-search">
        <span>Buscar actividad</span>
        <div className="actividades-search__control">
          <Search aria-hidden="true" />
          <input
            value={search}
            placeholder="Acta, actividad, tipo u organizador"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>

      <label className="actividades-filter">
        <span>Tipo de actividad</span>
        <select
          value={selectedActivityType}
          onChange={(event) => onActivityTypeChange(event.target.value as ActividadGrupalType | "")}
        >
          <option value="">Todos los tipos</option>
          {getActividadGrupalTypeOptions().map((activityType) => (
            <option key={activityType} value={activityType}>
              {formatActividadGrupalType(activityType)}
            </option>
          ))}
        </select>
      </label>

      {showTenantFilter ? (
        <label className="actividades-filter">
          <span>Centro</span>
          <select
            value={selectedTenantId}
            disabled={isTenantOptionsLoading}
            onChange={(event) => onTenantChange(event.target.value)}
          >
            <option value="">Todos los centros</option>
            {tenantOptions.map((tenant) => (
              <option key={tenant.id} value={tenant.id}>
                {tenant.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}
