import { type AlimentacionTenantOption } from "@cuidarte/contracts";
import { CalendarDays, Search } from "lucide-react";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type AlimentacionToolbarProps = {
  deliveryMonth: string;
  isTenantOptionsLoading: boolean;
  search: string;
  selectedTenantId: string;
  showTenantFilter: boolean;
  tenantOptions: AlimentacionTenantOption[];
  exportButton?: ReactNode;
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
  exportButton,
  onMonthChange,
  onSearchChange,
  onTenantChange,
}: AlimentacionToolbarProps) {
  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const selectedMonth = useMemo(() => parseDeliveryMonth(deliveryMonth), [deliveryMonth]);
  const [draftMonth, setDraftMonth] = useState<number>(
    selectedMonth?.getMonth() ?? new Date().getMonth(),
  );
  const [draftYear, setDraftYear] = useState<number>(
    selectedMonth?.getFullYear() ?? new Date().getFullYear(),
  );
  const yearOptions = useMemo(() => buildYearOptions(), []);

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
    onMonthChange(toDeliveryMonthValue(draftYear, draftMonth));
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
    <div
      className={`alimentacion-toolbar ${
        showTenantFilter
          ? "alimentacion-toolbar--with-tenant"
          : "alimentacion-toolbar--without-tenant"
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

      <div className="alimentacion-filter">
        <span>Mes</span>
        <Popover open={isMonthPickerOpen} onOpenChange={handleMonthPopoverOpenChange}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              aria-label="Mes"
              className="alimentacion-month-trigger"
            >
              <CalendarDays aria-hidden="true" />
              {selectedMonth === null ? "Todos los meses" : formatDeliveryMonthLabel(selectedMonth)}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3">
            <div className="alimentacion-month-picker">
              <label className="alimentacion-month-field">
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
              <label className="alimentacion-month-field">
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
            <div className="alimentacion-month-actions">
              <div className="alimentacion-month-actions-buttons">
                <Button type="button" variant="ghost" size="sm" onClick={resetDraftMonth}>
                  Limpiar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    onMonthChange("");
                    setIsMonthPickerOpen(false);
                  }}
                >
                  Todos
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="alimentacion-month-apply"
                  onClick={applyMonthSelection}
                >
                  Aplicar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>

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

      {exportButton === undefined ? null : (
        <div className="alimentacion-toolbar-export">{exportButton}</div>
      )}
    </div>
  );
}

function parseDeliveryMonth(value: string): Date | null {
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

function toDeliveryMonthValue(year: number, monthIndex: number): string {
  const month = String(monthIndex + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatDeliveryMonthLabel(value: Date): string {
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
