import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { toast } from "sonner";

import {
  atencionEnfermeriaFixture,
  atencionEnfermeriaOtherFixture,
  adultoMayorFixture,
  historiaClinicaFixture,
  enfermeriaUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { mockAtencionesMedicalHistoriaClinica } from "../../test/helpers/msw-domain.helpers";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";

describe("App atenciones de enfermería form flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("permite crear una atencion de enfermeria para un adulto del tenant", async () => {
    server.use(
      mockAuthMe(enfermeriaUserFixture),
    );
    const user = userEvent.setup();

    renderAppAtPath(`/atenciones-enfermeria/adultos-mayores/${adultoMayorFixture.id}/new`);

    expect(await screen.findByText("Nueva atencion")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Tension sistolica", { selector: "input" }), "120");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("tab", { name: "Nota de enfermeria" }));
    await user.type(
      screen.getByLabelText("Nota de enfermeria", { selector: "textarea" }),
      "Atencion inicial de enfermeria.",
    );

    await user.click(screen.getByRole("button", { name: "Crear atencion" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe("/atenciones-enfermeria/9d2b7f44-2b5f-4ec2-8c58-3d3f4e7b7e21");
    });

    expect(await screen.findByRole("button", { name: "Continuar" })).toBeInTheDocument();
    expect(screen.getByText("Adulto mayor")).toBeInTheDocument();
  });

  it("recupera el borrador local mientras se completa la atencion", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));
    const user = userEvent.setup();

    const firstRender = renderAppAtPath(`/atenciones-enfermeria/adultos-mayores/${adultoMayorFixture.id}/new`);

    expect(await screen.findByText("Nueva atencion")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.type(screen.getByLabelText("Tension sistolica", { selector: "input" }), "120");
    await user.click(screen.getByRole("button", { name: "Continuar" }));
    await user.click(screen.getByRole("tab", { name: "Nota de enfermeria" }));
    await user.type(
      screen.getByLabelText("Nota de enfermeria", { selector: "textarea" }),
      "Borrador de enfermeria en progreso.",
    );

    firstRender.unmount();

    renderAppAtPath(`/atenciones-enfermeria/adultos-mayores/${adultoMayorFixture.id}/new`);

    expect(await screen.findByRole("tab", { name: "Nota de enfermeria", selected: true })).toBeInTheDocument();
    expect(screen.getByLabelText("Tension sistolica", { selector: "input" })).toHaveValue("120");
    expect(screen.getByLabelText("Nota de enfermeria", { selector: "textarea" })).toHaveValue(
      "Borrador de enfermeria en progreso.",
    );
  });

  it("abre la pestaña de atenciones médicas en modo lectura desde la enfermería", async () => {
    server.use(
      mockAuthMe(enfermeriaUserFixture),
      mockAtencionesMedicalHistoriaClinica({
        ...historiaClinicaFixture,
        atenciones: historiaClinicaFixture.atenciones.map((atencion) => ({
          ...atencion,
          access: "view",
        })),
      }),
    );
    const user = userEvent.setup();

    renderAppAtPath(`/atenciones-enfermeria/adultos-mayores/${adultoMayorFixture.id}/new`);

    expect(await screen.findByText("Nueva atencion")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Atenciones médicas" }));

    const viewButtons = await screen.findAllByRole("button", { name: "Ver" });
    expect(viewButtons.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Editar" })).not.toBeInTheDocument();

    const firstViewButton = viewButtons[0];

    expect(firstViewButton).toBeDefined();
    await user.click(firstViewButton as HTMLElement);

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/${historiaClinicaFixture.atenciones[0].id}`,
      );
    });
  });

  it("permite editar una atencion propia", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));
    const user = userEvent.setup();
    const successSpy = vi.spyOn(toast, "success");

    renderAppAtPath(`/atenciones-enfermeria/${atencionEnfermeriaFixture.id}`);

    expect(await screen.findByRole("button", { name: "Continuar" })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: "Nota de enfermeria" }));
    await user.clear(screen.getByLabelText("Nota de enfermeria", { selector: "textarea" }));
    await user.type(
      screen.getByLabelText("Nota de enfermeria", { selector: "textarea" }),
      "Nota actualizada por la misma autora.",
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() => {
      expect(successSpy).toHaveBeenCalledWith("Atencion de enfermeria guardada.");
    });
  });

  it("muestra solo lectura cuando la atencion pertenece a otra profesional", async () => {
    server.use(mockAuthMe(enfermeriaUserFixture));

    renderAppAtPath(`/atenciones-enfermeria/${atencionEnfermeriaOtherFixture.id}`);

    expect(await screen.findByText("Vista de solo lectura. Esta atencion pertenece a otro profesional.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Crear atencion" })).not.toBeInTheDocument();
  });
});
