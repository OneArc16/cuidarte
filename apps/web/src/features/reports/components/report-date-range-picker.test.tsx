import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ReportDateRangePicker } from "./report-date-range-picker";

describe("ReportDateRangePicker", () => {
  it("keeps date-only ranges on the selected calendar days", async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(<ReportDateRangePicker from="2026-05-01" to="2026-09-30" onApply={onApply} />);

    expect(screen.getByRole("button", { name: "Seleccionar rango de fechas" })).toHaveTextContent(
      "01 may 2026 - 30 sept 2026",
    );

    await user.click(screen.getByRole("button", { name: "Seleccionar rango de fechas" }));

    const mayCalendar = screen.getByRole("region", { name: /mayo de 2026/i });
    await user.click(within(mayCalendar).getByRole("button", { name: "1" }));

    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));
    await user.click(screen.getByRole("button", { name: "Mes siguiente" }));

    const septemberCalendar = screen.getByRole("region", { name: /septiembre de 2026/i });
    await user.click(within(septemberCalendar).getByRole("button", { name: "30" }));
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onApply).toHaveBeenCalledWith({ from: "2026-05-01", to: "2026-09-30" });
  });
});
