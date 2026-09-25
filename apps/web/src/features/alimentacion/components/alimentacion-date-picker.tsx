import { CalendarDays, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";

type AlimentacionDatePickerProps = {
  label: string;
  mode: "single" | "multiple";
  value: string[];
  onChange: (dates: string[]) => void;
  error?: string | undefined;
};

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const SHORT_MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sept",
  "oct",
  "nov",
  "dic",
];
const CALENDAR_MONTH_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  month: "long",
});
const CALENDAR_WEEKDAY_FORMATTER = new Intl.DateTimeFormat("es-CO", {
  weekday: "short",
});

const CALENDAR_FORMATTERS = {
  formatCaption: (date: Date) => {
    const month = CALENDAR_MONTH_FORMATTER.format(date);
    const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1);

    return `${capitalizedMonth} ${date.getFullYear()}`;
  },
  formatWeekdayName: (date: Date) => CALENDAR_WEEKDAY_FORMATTER.format(date).replace(".", ""),
};

function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (match === null) {
    return null;
  }

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));

  return date.getFullYear() === Number(match[1]) &&
    date.getMonth() === Number(match[2]) - 1 &&
    date.getDate() === Number(match[3])
    ? date
    : null;
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return String(year) + "-" + month + "-" + day;
}

function isNextCalendarDay(previousDate: Date, currentDate: Date): boolean {
  const previousDay = Date.UTC(
    previousDate.getFullYear(),
    previousDate.getMonth(),
    previousDate.getDate(),
  );
  const currentDay = Date.UTC(
    currentDate.getFullYear(),
    currentDate.getMonth(),
    currentDate.getDate(),
  );

  return currentDay - previousDay === 24 * 60 * 60 * 1_000;
}

function formatMultipleDateSummary(dates: Date[]): string {
  if (dates.length === 0) {
    return "Seleccionar días";
  }

  const sortedDates = [...dates].sort(
    (firstDate, secondDate) => firstDate.getTime() - secondDate.getTime(),
  );
  const ranges = sortedDates.reduce<Array<{ start: Date; end: Date }>>((currentRanges, date) => {
    const currentRange = currentRanges.at(-1);

    if (currentRange !== undefined && isNextCalendarDay(currentRange.end, date)) {
      currentRange.end = date;
      return currentRanges;
    }

    currentRanges.push({ start: date, end: date });
    return currentRanges;
  }, []);
  const firstDate = sortedDates[0]!;
  const isSameMonth = sortedDates.every(
    (date) =>
      date.getFullYear() === firstDate.getFullYear() && date.getMonth() === firstDate.getMonth(),
  );
  const isSameYear = sortedDates.every((date) => date.getFullYear() === firstDate.getFullYear());

  if (isSameMonth) {
    const dayRanges = ranges
      .map(({ start, end }) =>
        start.getDate() === end.getDate()
          ? `${start.getDate()}`
          : `${start.getDate()}–${end.getDate()}`,
      )
      .join(", ");

    return `${dayRanges} ${SHORT_MONTHS[firstDate.getMonth()]} ${firstDate.getFullYear()}`;
  }

  const formattedRanges = ranges.map(({ start, end }) => {
    const startLabel = `${start.getDate()} ${SHORT_MONTHS[start.getMonth()]}`;

    return start.getTime() === end.getTime()
      ? startLabel
      : `${startLabel}–${end.getDate()} ${SHORT_MONTHS[end.getMonth()]}`;
  });

  return `${formattedRanges.join(", ")}${isSameYear ? ` ${firstDate.getFullYear()}` : ""}`;
}

export function AlimentacionDatePicker({
  error,
  label,
  mode,
  onChange,
  value,
}: AlimentacionDatePickerProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const selectedDates = useMemo(
    () => value.map(parseIsoDate).filter((date): date is Date => date !== null),
    [value],
  );

  function selectMultipleDates(dates: Date[] | undefined) {
    onChange((dates ?? []).map(formatIsoDate).sort());
  }

  const multipleDateSummary = formatMultipleDateSummary(selectedDates);

  return (
    <div className="alimentacion-date-picker" data-mode={mode}>
      <div className="alimentacion-date-picker__label-row">
        <span className="alimentacion-date-picker__label">
          <CalendarDays aria-hidden="true" />
          {label}
        </span>
      </div>

      {mode === "multiple" ? (
        <div className="alimentacion-date-picker__multiple-control">
          <button
            className="alimentacion-date-picker__trigger"
            type="button"
            aria-haspopup="dialog"
            aria-expanded={isCalendarOpen}
            aria-label={`${label}: ${multipleDateSummary}`}
            onClick={() => setIsCalendarOpen((current) => !current)}
          >
            <CalendarDays aria-hidden="true" />
            {selectedDates.length > 0 ? (
              <span className="alimentacion-date-picker__trigger-count">
                {selectedDates.length} {selectedDates.length === 1 ? "día" : "días"}
              </span>
            ) : null}
            <span className="alimentacion-date-picker__trigger-summary">{multipleDateSummary}</span>
            <ChevronDown aria-hidden="true" />
          </button>

          {isCalendarOpen ? (
            <div className="alimentacion-date-picker__calendar" role="dialog" aria-label={label}>
              <DayPicker
                mode="multiple"
                selected={selectedDates}
                onSelect={selectMultipleDates}
                max={31}
                showOutsideDays
                fixedWeeks
                formatters={CALENDAR_FORMATTERS}
                aria-label={label}
              />
              <div className="alimentacion-date-picker__calendar-footer">
                <span>
                  {selectedDates.length === 0
                    ? "Selecciona uno o varios días"
                    : `${selectedDates.length} ${selectedDates.length === 1 ? "día" : "días"} seleccionados`}
                </span>
                <button type="button" onClick={() => setIsCalendarOpen(false)}>
                  Listo
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        <input
          className="alimentacion-date-picker__native-input"
          type="date"
          aria-label="Fecha"
          value={value[0] ?? ""}
          onChange={(event) => onChange(event.target.value === "" ? [] : [event.target.value])}
        />
      )}

      {error !== undefined ? <p className="form-error">{error}</p> : null}
    </div>
  );
}
