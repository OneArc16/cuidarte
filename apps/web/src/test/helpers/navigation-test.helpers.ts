import { within } from "@testing-library/react";
import { expect } from "vitest";

export function expectBaseModules(navigation: HTMLElement): void {
  [
    "Inicio",
    "Adultos mayores",
    "Sesiones grupales",
    "Registro de alimentación",
    "Gestión de empleados",
  ].forEach((moduleLabel) => {
    expect(within(navigation).getByRole("button", { name: moduleLabel })).toBeInTheDocument();
  });
  expect(
    within(navigation).queryByRole("button", { name: "Creación de actividades" }),
  ).not.toBeInTheDocument();
}
