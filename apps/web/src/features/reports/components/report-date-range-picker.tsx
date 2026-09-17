import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type ReportDateRangePickerProps = {
  from: string;
  to: string;
  onApply: (range: { from: string; to: string }) => void;
};

export function ReportDateRangePicker({ from, to, onApply }: ReportDateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(from));

  useEffect(() => {
    if (!open) {
      setDraftFrom(from);
      setDraftTo(to);
      setVisibleMonth(startOfMonth(from));
    }
  }, [from, open, to]);

  const secondMonth = addMonths(visibleMonth, 1);

  function chooseDate(value: string) {
    if (draftFrom === "" || draftTo !== "") {
      setDraftFrom(value);
      setDraftTo("");
    } else if (value < draftFrom) {
      setDraftFrom(value);
    } else {
      setDraftTo(value);
    }
  }

  function applyRange() {
    if (draftFrom === "" || draftTo === "") return;
    onApply({ from: draftFrom, to: draftTo });
    setOpen(false);
  }

  return (
    <div className="reports-range-field">
      <span>Rango de fechas</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="reports-range-trigger"
            aria-label="Seleccionar rango de fechas"
          >
            <CalendarRange aria-hidden="true" />
            <span>
              {formatShortDate(from)} - {formatShortDate(to)}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="reports-range-popover">
          <div className="reports-range-header">
            <button
              type="button"
              className="reports-range-nav"
              aria-label="Mes anterior"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
            >
              <ChevronLeft aria-hidden="true" />
            </button>
            <span>Selecciona el periodo</span>
            <button
              type="button"
              className="reports-range-nav"
              aria-label="Mes siguiente"
              onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
          <div className="reports-range-calendars">
            <CalendarMonth
              month={visibleMonth}
              from={draftFrom}
              to={draftTo}
              onSelect={chooseDate}
            />
            <CalendarMonth
              month={secondMonth}
              from={draftFrom}
              to={draftTo}
              onSelect={chooseDate}
            />
          </div>
          <div className="reports-range-footer">
            <span>
              {draftTo === ""
                ? "Selecciona la fecha final"
                : `${formatShortDate(draftFrom)} - ${formatShortDate(draftTo)}`}
            </span>
            <Button
              type="button"
              size="sm"
              className="reports-range-apply"
              disabled={draftFrom === "" || draftTo === ""}
              onClick={applyRange}
            >
              Aplicar
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function CalendarMonth({
  month,
  from,
  to,
  onSelect,
}: {
  month: string;
  from: string;
  to: string;
  onSelect: (value: string) => void;
}) {
  const days = useMemo(() => buildMonthDays(month), [month]);
  const label = new Intl.DateTimeFormat("es-CO", {
    month: "long",
    timeZone: "UTC",
    year: "numeric",
  }).format(parseDate(month));

  return (
    <section className="reports-calendar-month" aria-label={label}>
      <h3>{capitalize(label)}</h3>
      <div className="reports-calendar-weekdays" aria-hidden="true">
        {WEEKDAYS.map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div className="reports-calendar-grid">
        {days.map((day, index) =>
          day === null ? (
            <span
              className="reports-calendar-day reports-calendar-day--empty"
              key={`empty-${index}`}
            />
          ) : (
            <button
              className={`reports-calendar-day${from !== "" && to !== "" && day > from && day < to ? " reports-calendar-day--inside" : ""}${day === from ? " reports-calendar-day--start" : ""}${day === to ? " reports-calendar-day--end" : ""}`}
              key={day}
              type="button"
              aria-pressed={day === from || day === to}
              onClick={() => onSelect(day)}
            >
              {Number(day.slice(-2))}
            </button>
          ),
        )}
      </div>
    </section>
  );
}

const WEEKDAYS = ["Lu", "Ma", "Mi", "Ju", "Vi", "Sa", "Do"];

function buildMonthDays(month: string): Array<string | null> {
  const date = parseDate(month);
  const firstDay = (date.getUTCDay() + 6) % 7;
  const daysInMonth = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  const days: Array<string | null> = Array.from({ length: firstDay }, () => null);
  for (let day = 1; day <= daysInMonth; day += 1)
    days.push(`${month.slice(0, 7)}-${String(day).padStart(2, "0")}`);
  return days;
}

function startOfMonth(value: string): string {
  return `${value.slice(0, 7)}-01`;
}

function addMonths(value: string, amount: number): string {
  const date = parseDate(value);
  date.setUTCMonth(date.getUTCMonth() + amount);
  return `${date.toISOString().slice(0, 7)}-01`;
}

function parseDate(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`);
}

function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("es-CO", {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
    year: "numeric",
  })
    .format(parseDate(value))
    .replaceAll(" de ", " ");
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
