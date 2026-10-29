import { Search, SlidersHorizontal } from "lucide-react";

type NutricionToolbarProps = {
  search: string;
  canClearFilters: boolean;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
};

export function NutricionToolbar({
  canClearFilters,
  onClearFilters,
  onSearchChange,
  search,
}: NutricionToolbarProps) {
  return (
    <section className="nutricion-toolbar" aria-label="Filtros de nutrición">
      <label className="nutricion-search">
        <span>Buscar adulto mayor</span>
        <div>
          <Search aria-hidden="true" />
          <input
            type="search"
            value={search}
            placeholder="Nombre, documento o teléfono"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>
      <button
        className="outline-action"
        type="button"
        disabled={!canClearFilters}
        onClick={onClearFilters}
      >
        <SlidersHorizontal aria-hidden="true" />
        <span>Limpiar filtros</span>
      </button>
    </section>
  );
}
