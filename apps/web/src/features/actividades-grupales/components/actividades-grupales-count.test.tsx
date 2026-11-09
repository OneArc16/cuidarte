import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ActividadesGrupalesCount } from "./actividades-grupales-count";

describe("ActividadesGrupalesCount", () => {
  it("muestra cuántas actividades cumplen los filtros", () => {
    render(<ActividadesGrupalesCount count={15} isLoading={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("15 actividades");
  });

  it("usa singular para una sola actividad", () => {
    render(<ActividadesGrupalesCount count={1} isLoading={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("1 actividad");
    expect(screen.getByRole("status")).not.toHaveTextContent("actividades");
  });

  it("muestra cero cuando ningún registro cumple los filtros", () => {
    render(<ActividadesGrupalesCount count={0} isLoading={false} />);

    expect(screen.getByRole("status")).toHaveTextContent("0 actividades");
  });

  it("no muestra un número mientras carga", () => {
    render(<ActividadesGrupalesCount count={0} isLoading />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
