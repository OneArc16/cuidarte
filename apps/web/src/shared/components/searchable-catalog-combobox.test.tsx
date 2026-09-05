import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchableCatalogCombobox } from "./searchable-catalog-combobox";

describe("SearchableCatalogCombobox", () => {
  it("muestra las opciones al enfocar el campo", async () => {
    const user = userEvent.setup();

    render(
      <SearchableCatalogCombobox
        ariaLabel="Grupo poblacional"
        onValueChange={vi.fn()}
        options={[
          { id: "Indigena", name: "Indigena" },
          { id: "ROM (gitano)", name: "ROM (gitano)" },
        ]}
        value=""
      />,
    );

    const input = screen.getByRole("combobox", { name: "Grupo poblacional" });
    await user.click(input);

    expect(await screen.findByRole("option", { name: "Indigena" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "ROM (gitano)" })).toBeInTheDocument();
  });

  it("filtra y permite seleccionar una opción al escribir", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SearchableCatalogCombobox
        ariaLabel="Grupo poblacional"
        onValueChange={onValueChange}
        options={[
          { id: "Indigena", name: "Indigena" },
          { id: "ROM (gitano)", name: "ROM (gitano)" },
        ]}
        value=""
      />,
    );

    const input = screen.getByRole("combobox", { name: "Grupo poblacional" });
    await user.click(input);
    await user.type(input, "ROM");

    expect(screen.queryByRole("option", { name: "Indigena" })).not.toBeInTheDocument();
    expect(await screen.findByRole("option", { name: "ROM (gitano)" })).toBeInTheDocument();

    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("ROM (gitano)");
  });
});
