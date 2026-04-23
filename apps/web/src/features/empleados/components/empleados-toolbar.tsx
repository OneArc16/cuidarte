import { Search } from "lucide-react";

type EmpleadosToolbarProps = {
  search: string;
  onSearchChange: (search: string) => void;
};

export function EmpleadosToolbar({ onSearchChange, search }: EmpleadosToolbarProps) {
  return (
    <div className="empleados-toolbar">
      <label className="empleados-search">
        <span>Buscar usuario</span>
        <div className="empleados-search__control">
          <Search aria-hidden="true" />
          <input
            type="search"
            value={search}
            placeholder="Documento, nombre, correo o telefono"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
      </label>
    </div>
  );
}
