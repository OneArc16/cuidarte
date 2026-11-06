const DATE_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Bogota",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatCurrentDate() {
  const parts = DATE_FORMATTER.formatToParts(new Date());
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return `${values.get("year")}-${values.get("month")}-${values.get("day")}`;
}

export function formatDateForMessage(value: string) {
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}
