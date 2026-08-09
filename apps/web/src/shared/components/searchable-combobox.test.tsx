import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { SearchableCombobox } from "./searchable-combobox";

const options = [
  { id: "cundinamarca", name: "Cundinamarca" },
  { id: "antioquia", name: "Antioquia" },
] as const;

describe("SearchableCombobox", () => {
  it("muestra opciones solo despues de escribir el minimo de caracteres", async () => {
    const user = userEvent.setup();

    render(
      <SearchableCombobox
        ariaLabel="Departamento"
        getOptionLabel={(option) => option.name}
        onValueChange={vi.fn()}
        options={options}
        value=""
      />,
    );

    await user.type(screen.getByRole("combobox", { name: "Departamento" }), "Cu");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();

    await user.type(screen.getByRole("combobox", { name: "Departamento" }), "n");
    expect(await screen.findByRole("option", { name: "Cundinamarca" })).toBeInTheDocument();
  });

  it("devuelve el id seleccionado al usar el teclado", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();

    render(
      <SearchableCombobox
        ariaLabel="Departamento"
        getOptionLabel={(option) => option.name}
        onValueChange={onValueChange}
        options={options}
        value=""
      />,
    );

    const input = screen.getByRole("combobox", { name: "Departamento" });
    await user.type(input, "Cun");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("cundinamarca");
  });

  it("soporta opciones con espacios y signos de puntuacion en el id", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    const specialOptions = [{ id: "ROM (gitano)", name: "ROM (gitano)" }];

    render(
      <SearchableCombobox
        ariaLabel="Grupo poblacional"
        getOptionLabel={(option) => option.name}
        onValueChange={onValueChange}
        options={specialOptions}
        value=""
      />,
    );

    const input = screen.getByRole("combobox", { name: "Grupo poblacional" });
    await user.type(input, "ROM");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onValueChange).toHaveBeenCalledWith("ROM (gitano)");
  });
});
