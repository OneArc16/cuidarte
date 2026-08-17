import { Search, SlidersHorizontal } from "lucide-react";

type AtencionesEnfermeriaToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onClearFilters: () => void;
  canClearFilters: boolean;
};

export function AtencionesEnfermeriaToolbar({
  canClearFilters,
  onClearFilters,
  onSearchChange,
  search,
}: AtencionesEnfermeriaToolbarProps) {
  return (
    <section className="atenciones-enfermeria-toolbar" aria-label="Filtros de enfermería">
      <div className="atenciones-enfermeria-toolbar__grid">
        <label className="atenciones-enfermeria-search">
          <span>Buscar</span>
          <div className="atenciones-enfermeria-search__control">
            <Search aria-hidden="true" />
            <input
              type="search"
              value={search}
              placeholder="Nombre, documento o teléfono"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </div>
        </label>

        <div className="atenciones-enfermeria-toolbar__actions">
          <button
            className="outline-action"
            type="button"
            onClick={onClearFilters}
            disabled={!canClearFilters}
          >
            <SlidersHorizontal aria-hidden="true" />
            <span>Limpiar filtros</span>
          </button>
        </div>
      </div>
    </section>
  );
}
