import { CalendarDays, Search } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";
import {
  type ActividadGrupalOrganizer,
  type ActividadGrupalTipo,
  type ActividadGrupalTenantOption,
} from "@cuidarte/contracts";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

import { getActividadGrupalOrganizerFilterOptions } from "../lib/actividades-grupales-formatters";

type ActividadesGrupalesToolbarProps = {
  selectedActivityTypeId: string;
  selectedOrganizer: ActividadGrupalOrganizer | "";
  activityMonth: string;
  search: string;
  selectedTenantId: string;
  showMonthFilter?: boolean;
  showTenantFilter: boolean;
  tenantOptions: ActividadGrupalTenantOption[];
  activityTypeOptions: ActividadGrupalTipo[];
  isTenantOptionsLoading: boolean;
  exportButton?: ReactNode;
  onActivityTypeIdChange: (activityTypeId: string) => void;
  onActivityMonthChange: (activityMonth: string) => void;
  onOrganizerChange: (organizer: ActividadGrupalOrganizer | "") => void;
  onSearchChange: (search: string) => void;
  onTenantChange: (tenantId: string) => void;
};

export function ActividadesGrupalesToolbar({
  activityMonth,
  exportButton,
  isTenantOptionsLoading,
  onActivityTypeIdChange,
  onActivityMonthChange,
  onOrganizerChange,
  onSearchChange,
  onTenantChange,
  search,
  selectedActivityTypeId,
  selectedOrganizer,
  selectedTenantId,
  showMonthFilter = true,
  showTenantFilter,
  tenantOptions,
  activityTypeOptions,
}: ActividadesGrupalesToolbarProps) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const selectedMonth = useMemo(() => parseActivityMonth(activityMonth), [activityMonth]);
  const [draftMonth, setDraftMonth] = useState<number>(
    selectedMonth?.getMonth() ?? new Date().getMonth(),
  );
  const [draftYear, setDraftYear] = useState<number>(
    selectedMonth?.getFullYear() ?? new Date().getFullYear(),
  );
  const yearOptions = useMemo(() => buildYearOptions(), []);
  const unifiedActivityTypeOptions = useMemo(() => {
    const byName = new Map<string, ActividadGrupalTipo>();

    for (const activityType of activityTypeOptions) {
      const key = activityType.normalizedName || activityType.name.trim().toLocaleLowerCase();
      const current = byName.get(key);

      if (current === undefined) {
        byName.set(key, activityType);
        continue;
      }

      if (!current.isActive && activityType.isActive) {
        byName.set(key, { ...current, isActive: true });
      }
    }

    return [...byName.values()];
  }, [activityTypeOptions]);

  useEffect(() => {
    if (selectedMonth === null) {
      const today = new Date();
      setDraftMonth(today.getMonth());
      setDraftYear(today.getFullYear());
      return;
    }

    setDraftMonth(selectedMonth.getMonth());
    setDraftYear(selectedMonth.getFullYear());
  }, [selectedMonth]);

  function applyMonthSelection() {
    onActivityMonthChange(toActivityMonthValue(draftYear, draftMonth));
    setIsMonthPickerOpen(false);
  }

  function resetDraftMonth() {
    const today = new Date();
    setDraftMonth(today.getMonth());
    setDraftYear(today.getFullYear());
  }

  function handleMonthPopoverOpenChange(open: boolean) {
    if (open) {
      const baseDate = selectedMonth ?? new Date();
      setDraftMonth(baseDate.getMonth());
      setDraftYear(baseDate.getFullYear());
    }

    setIsMonthPickerOpen(open);
  }

  return (
    <section
      className={`actividades-toolbar${showTenantFilter ? " actividades-toolbar--with-tenant" : ""}`}
      aria-label="Herramientas del listado"
    >
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

      {showMonthFilter ? (
        <div className="actividades-filter">
          <span>Mes</span>
          <Popover open={isMonthPickerOpen} onOpenChange={handleMonthPopoverOpenChange}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                aria-label="Mes"
                className="actividades-month-trigger"
              >
                <CalendarDays aria-hidden="true" />
                {selectedMonth === null
                  ? "Todos los meses"
                  : formatActivityMonthLabel(selectedMonth)}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-3">
              <div className="actividades-month-picker">
                <label className="actividades-month-field">
                  <span>Mes</span>
                  <select
                    aria-label="Seleccionar mes"
                    value={String(draftMonth)}
                    onChange={(event) => setDraftMonth(Number.parseInt(event.target.value, 10))}
                  >
                    {MONTH_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="actividades-month-field">
                  <span>Año</span>
                  <select
                    aria-label="Seleccionar año"
                    value={String(draftYear)}
                    onChange={(event) => setDraftYear(Number.parseInt(event.target.value, 10))}
                  >
                    {yearOptions.map((year) => (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="actividades-month-actions">
                <div className="actividades-month-actions-buttons">
                  <Button type="button" variant="ghost" size="sm" onClick={resetDraftMonth}>
                    Limpiar
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      onActivityMonthChange("");
                      setIsMonthPickerOpen(false);
                    }}
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="actividades-month-apply"
                    onClick={applyMonthSelection}
                  >
                    Aplicar
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}

      <label className="actividades-filter">
        <span>Tipo de actividad</span>
        <select
          value={selectedActivityTypeId}
          onChange={(event) => onActivityTypeIdChange(event.target.value)}
        >
          <option value="">Todas las actividades</option>
          {unifiedActivityTypeOptions.map((activityType) => (
            <option key={activityType.id} value={activityType.id}>
              {activityType.name}
              {activityType.isActive ? "" : " (Inactiva)"}
            </option>
          ))}
        </select>
      </label>

      <label className="actividades-filter">
        <span>Organizador / equipo</span>
        <select
          value={selectedOrganizer}
          onChange={(event) =>
            onOrganizerChange(event.target.value as ActividadGrupalOrganizer | "")
          }
        >
          <option value="">Todos los organizadores y equipos</option>
          {getActividadGrupalOrganizerFilterOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
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

      {exportButton === undefined ? null : (
        <div className="actividades-toolbar-export">{exportButton}</div>
      )}
    </section>
  );
}

function parseActivityMonth(value: string): Date | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);

  if (match === null) {
    return null;
  }

  const yearValue = match[1];
  const monthValue = match[2];

  if (yearValue === undefined || monthValue === undefined) {
    return null;
  }

  const year = Number.parseInt(yearValue, 10);
  const month = Number.parseInt(monthValue, 10);

  return new Date(year, month - 1, 1);
}

function toActivityMonthValue(year: number, monthIndex: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatActivityMonthLabel(value: Date): string {
  const formatter = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  });

  const formattedValue = formatter.format(value);

  return formattedValue.charAt(0).toUpperCase() + formattedValue.slice(1);
}

function buildYearOptions(): number[] {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 10;
  const endYear = currentYear + 2;
  const years: number[] = [];

  for (let year = endYear; year >= startYear; year -= 1) {
    years.push(year);
  }

  return years;
}

const MONTH_OPTIONS = [
  { value: 0, label: "Enero" },
  { value: 1, label: "Febrero" },
  { value: 2, label: "Marzo" },
  { value: 3, label: "Abril" },
  { value: 4, label: "Mayo" },
  { value: 5, label: "Junio" },
  { value: 6, label: "Julio" },
  { value: 7, label: "Agosto" },
  { value: 8, label: "Septiembre" },
  { value: 9, label: "Octubre" },
  { value: 10, label: "Noviembre" },
  { value: 11, label: "Diciembre" },
] as const;
