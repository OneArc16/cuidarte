import { type ActividadGrupalDiligenciamientoDetail } from "@cuidarte/contracts";
import { act, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { actividadGrupalDiligenciamientoFixture } from "../../../test/fixtures";
import { renderWithProviders } from "../../../test/render-with-providers";

import { ActividadGrupalDiligenciamientoForm } from "./actividad-grupal-diligenciamiento-form";

describe("ActividadGrupalDiligenciamientoForm", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows only the support photo size in the carousel metadata", () => {
    const detail: ActividadGrupalDiligenciamientoDetail = {
      ...actividadGrupalDiligenciamientoFixture,
      actaOrganizer: "fisioterapeuta",
      actaSequence: 4,
      previousActaNumber: null,
      assignedProfessionals: [...actividadGrupalDiligenciamientoFixture.assignedProfessionals],
      integrantes: [...actividadGrupalDiligenciamientoFixture.integrantes],
      photoFiles: [...actividadGrupalDiligenciamientoFixture.photoFiles],
    };

    renderWithProviders(
      <ActividadGrupalDiligenciamientoForm
        activityId={detail.id}
        detail={detail}
        error={null}
        isPending={false}
        mode="view"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("240 KB")).toBeInTheDocument();
    expect(screen.queryByText("foto-soporte.webp")).not.toBeInTheDocument();
  });

  it("shows a progress bar while preparing an attached PDF", async () => {
    let finishReadingPdf: ((value: ArrayBuffer) => void) | undefined;
    vi.spyOn(File.prototype, "arrayBuffer").mockImplementation(
      () =>
        new Promise<ArrayBuffer>((resolve) => {
          finishReadingPdf = resolve;
        }),
    );
    const user = userEvent.setup();
    const detail: ActividadGrupalDiligenciamientoDetail = {
      ...actividadGrupalDiligenciamientoFixture,
      actaOrganizer: "medico",
      actaSequence: 4,
      previousActaNumber: null,
      assignedProfessionals: [...actividadGrupalDiligenciamientoFixture.assignedProfessionals],
      integrantes: [...actividadGrupalDiligenciamientoFixture.integrantes],
      photoFiles: [...actividadGrupalDiligenciamientoFixture.photoFiles],
      pdfFile: null,
    };

    renderWithProviders(
      <ActividadGrupalDiligenciamientoForm
        activityId={actividadGrupalDiligenciamientoFixture.id}
        detail={detail}
        error={null}
        isPending={false}
        mode="edit"
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
      />,
    );

    await user.upload(
      screen.getByLabelText("Adjuntar documento PDF"),
      new File(["pdf"], "soporte-nuevo.pdf", { type: "application/pdf" }),
    );

    expect(screen.getByRole("progressbar", { name: "Preparando PDF" })).toBeInTheDocument();
    expect(screen.getByText("soporte-nuevo.pdf")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Preparando PDF..." })).toBeDisabled();

    await act(async () => {
      finishReadingPdf?.(new ArrayBuffer(3));
    });

    expect(await screen.findByRole("button", { name: "Quitar PDF nuevo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });
});
