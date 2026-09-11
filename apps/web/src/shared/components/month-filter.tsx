import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type MonthFilterProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
};

export function MonthFilter({ value, onChange, label = "Mes" }: MonthFilterProps) {
  const [open, setOpen] = useState(false);
  const selectedMonth = useMemo(() => parseMonth(value), [value]);
  const [month, setMonth] = useState(selectedMonth?.getMonth() ?? new Date().getMonth());
  const [year, setYear] = useState(selectedMonth?.getFullYear() ?? new Date().getFullYear());
  const years = useMemo(() => buildYearOptions(), []);

  useEffect(() => {
    const base = selectedMonth ?? new Date();
    setMonth(base.getMonth());
    setYear(base.getFullYear());
  }, [selectedMonth]);

  return (
    <div className="alimentacion-filter">
      <span>{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button type="button" variant="outline" aria-label={label} className="alimentacion-month-trigger">
            <CalendarDays aria-hidden="true" />
            {selectedMonth === null ? "Todos los meses" : formatMonth(selectedMonth)}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-3">
          <div className="alimentacion-month-picker">
            <label className="alimentacion-month-field">
              <span>Mes</span>
              <select value={String(month)} onChange={(event) => setMonth(Number(event.target.value))}>
                {MONTHS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="alimentacion-month-field">
              <span>Año</span>
              <select value={String(year)} onChange={(event) => setYear(Number(event.target.value))}>
                {years.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="alimentacion-month-actions">
            <Button type="button" variant="ghost" size="sm" onClick={() => { onChange("ALL"); setOpen(false); }}>
              Todos
            </Button>
            <Button type="button" size="sm" className="alimentacion-month-apply" onClick={() => { onChange(toMonth(year, month)); setOpen(false); }}>
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function parseMonth(value: string): Date | null {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value);
  return match === null ? null : new Date(Number(match[1]), Number(match[2]) - 1, 1);
}

function toMonth(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function formatMonth(value: Date): string {
  const result = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(value);
  return result.charAt(0).toUpperCase() + result.slice(1);
}

function buildYearOptions(): number[] {
  const current = new Date().getFullYear();
  return Array.from({ length: 13 }, (_, index) => current + 2 - index);
}

const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map((label, value) => ({ label, value }));
