import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { AlimentacionDatePicker } from "./alimentacion-date-picker";

vi.mock("react-day-picker", () => ({
  DayPicker: ({
    onSelect,
  }: {
    onSelect?: (dates: Date[], triggerDate: Date, modifiers: { selected?: boolean }) => void;
  }) => (
    <button
      type="button"
      onClick={() =>
        onSelect?.([new Date(2026, 1, 1)], new Date(2026, 1, 1), { selected: false })
      }
    >
      Intentar seleccionar un día más
    </button>
  ),
}));

describe("AlimentacionDatePicker", () => {
  it("conserva los días elegidos y avisa al intentar superar el límite", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const thirtyOneDates = Array.from(
      { length: 31 },
      (_, index) => `2026-01-${String(index + 1).padStart(2, "0")}`,
    );

    render(
      <AlimentacionDatePicker
        label="Días de entrega"
        mode="multiple"
        value={thirtyOneDates}
        onChange={onChange}
      />,
    );

    await user.click(screen.getByRole("button", { name: /días de entrega/i }));
    await user.click(screen.getByRole("button", { name: "Intentar seleccionar un día más" }));

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Puedes seleccionar máximo 31 días.",
    );
    expect(screen.getByText("31 días seleccionados")).toBeInTheDocument();
  });
});
