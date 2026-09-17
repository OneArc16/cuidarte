import { http, HttpResponse } from "msw";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import {
  adultoMayorFixture,
  atencionIndividualFixture,
  atencionEnfermeriaHistoryFixture,
  authUserFixture,
  cie10OptionsFixture,
  historiaClinicaFixture,
  medicoUserFixture,
  otherProfessionalAtencionIndividualFixture,
  recreacionistaUserFixture,
} from "../../test/fixtures";
import { server } from "../../test/test-server";
import { renderAppAtPath, resetAppTestState } from "../../test/helpers/app-test.helpers";
import { mockAuthMe } from "../../test/helpers/msw-auth.helpers";
import { mockAtencionesHistoriaClinica } from "../../test/helpers/msw-domain.helpers";
import { readRequestPayload } from "../../test/helpers/msw-request.helpers";

type AtencionCreatePayload = {
  diagnosticos?: Array<{
    codigoCie10: string;
    descripcion: string;
    tipo: string;
  }>;
} & Record<string, unknown>;

describe("App atenciones flow", () => {
  beforeEach(() => {
    resetAppTestState();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("opens the individual attention form from the adultos mayores shortcut", async () => {
    server.use(mockAuthMe(medicoUserFixture));
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores");

    const shortcut = await screen.findByRole("button", {
      name: `Atencion individual de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
    });
    await user.click(shortcut);

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/new`,
      );
    });
    expect(await screen.findByText("Nueva atencion individual")).toBeInTheDocument();
    expect(screen.getByText(atencionIndividualFixture.adultoMayor.fullName)).toBeInTheDocument();
    expect(screen.getByLabelText("Consecutivo")).toHaveValue(1);

    server.use(
      http.get(
        "http://localhost:3001/api/atenciones-enfermeria/adultos-mayores/:adultoMayorId/history",
        () =>
          HttpResponse.json({
            ...atencionEnfermeriaHistoryFixture,
            atenciones: atencionEnfermeriaHistoryFixture.atenciones.map((atencion) => ({
              ...atencion,
              access: "view",
            })),
          }),
      ),
    );

    await user.click(screen.getByRole("tab", { name: "Atenciones de enfermería" }));

    const accessButtons = await screen.findAllByRole("button", { name: "Ver atención" });
    expect(accessButtons.length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: "Editar atención" })).not.toBeInTheDocument();
  });

  it("opens historia clinica for a professional and shows only editable owned attentions", async () => {
    server.use(
      mockAuthMe(medicoUserFixture),
      mockAtencionesHistoriaClinica({
        adultoMayor: historiaClinicaFixture.adultoMayor,
        atenciones: [historiaClinicaFixture.atenciones[0]],
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores");

    const shortcut = await screen.findByRole("button", {
      name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
    });
    await user.click(shortcut);

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/historia-clinica`,
      );
    });
    expect(await screen.findByText("Seguimiento clinico")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nueva atencion" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
  });

  it("opens historia clinica for admin users and reuses the attention view in read-only mode", async () => {
    server.use(
      mockAuthMe(authUserFixture),
      mockAtencionesHistoriaClinica({
        adultoMayor: historiaClinicaFixture.adultoMayor,
        atenciones: [
          {
            ...historiaClinicaFixture.atenciones[1],
            access: "view",
          },
        ],
      }),
      http.get("http://localhost:3001/api/atenciones-individuales/:atencionId", () =>
        HttpResponse.json({
          ...otherProfessionalAtencionIndividualFixture,
          access: "view",
        }),
      ),
    );
    const user = userEvent.setup();
    renderAppAtPath("/adultos-mayores");

    const shortcut = await screen.findByRole("button", {
      name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
    });
    await user.click(shortcut);

    expect(await screen.findByText("Seguimiento clinico")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Nueva atencion" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/${otherProfessionalAtencionIndividualFixture.id}`,
      );
    });
    expect(
      await screen.findByText("Vista de solo lectura. Esta atencion no se puede editar desde tu rol."),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar atencion" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Volver" }).length).toBeGreaterThan(0);
  });

  it("keeps historia clinica disabled for unsupported roles", async () => {
    server.use(mockAuthMe(recreacionistaUserFixture));
    renderAppAtPath("/adultos-mayores");

    expect(
      await screen.findByRole("heading", { name: "Listado de adultos mayores" }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("button", {
        name: `Historia clinica de ${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
      }),
    ).toBeDisabled();
  });

  it("searches CIE-10 by code or name from the diagnostics tab", async () => {
    server.use(
      mockAuthMe({ ...authUserFixture, role: "medico" }),
    );
    let createPayload: AtencionCreatePayload = {};
    server.use(
      http.post("http://localhost:3001/api/atenciones-individuales", async ({ request }) => {
        createPayload = (await readRequestPayload(request)) as AtencionCreatePayload;

        return HttpResponse.json({
          ...atencionIndividualFixture,
          ...createPayload,
          access: "edit",
          diagnosticos: [
            {
              id: "diagnostico-1",
              codigoCie10: "G56.0",
              descripcion: cie10OptionsFixture[0].title,
              tipo: "principal",
            },
          ],
        });
      }),
    );
    const user = userEvent.setup();
    renderAppAtPath(`/adultos-mayores/${adultoMayorFixture.id}/atenciones/new`);

    expect(await screen.findByText("Nueva atencion individual")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Motivo de consulta"), "Dolor en mano derecha");
    await user.type(screen.getByLabelText("Enfermedad actual"), "Paciente estable en seguimiento.");
    await user.click(screen.getByRole("tab", { name: "Diagnosticos" }));

    const cie10Input = screen.getByLabelText("Buscar CIE-10");

    await user.type(cie10Input, "g56");
    expect(
      await screen.findByRole("button", { name: /G56\.0.*SINDROME DEL TUNEL CARPIANO/i }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole("button", { name: /G56\.0.*SINDROME DEL TUNEL CARPIANO/i }),
    );
    expect(screen.getByDisplayValue(cie10OptionsFixture[0].title)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar y continuar" }));
    await user.click(screen.getByRole("tab", { name: "Soportes" }));
    await user.click(screen.getByRole("button", { name: "Guardar atencion" }));

    await waitFor(() => {
      expect(window.location.pathname).toBe(
        `/adultos-mayores/${adultoMayorFixture.id}/atenciones/${atencionIndividualFixture.id}`,
      );
    });
    expect(createPayload).toMatchObject({
      diagnosticos: [
        {
          codigoCie10: "G56.0",
          descripcion: cie10OptionsFixture[0].title,
          tipo: "principal",
        },
      ],
    });
  });
});
