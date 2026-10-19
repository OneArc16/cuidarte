import { type ActividadGrupalFormOptionsResponse, type AuthUser } from "@cuidarte/contracts";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { renderWithProviders } from "../../../test/render-with-providers";

import { ActividadGrupalForm } from "./actividad-grupal-form";

const userWithoutTeam: AuthUser = {
  id: "11111111-1111-4111-8111-111111111111",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  teamId: null,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
};

const formOptions: ActividadGrupalFormOptionsResponse = {
  empleados: [
    {
      id: userWithoutTeam.id,
      fullName: userWithoutTeam.fullName,
      role: userWithoutTeam.role,
    },
  ],
  activityTypes: [
    {
      id: "22222222-2222-4222-8222-222222222222",
      tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
      name: "Actividades de Manualidad",
      normalizedName: "actividades de manualidad",
      consecutiveMode: "individual",
      consecutiveConfig: {
        prefix: "MANU",
        nextValue: 1,
        creatorUserIds: [userWithoutTeam.id],
      },
      isActive: true,
      createdAt: "2026-10-19T12:00:00.000Z",
      updatedAt: "2026-10-19T12:00:00.000Z",
      deactivatedAt: null,
    },
  ],
};

describe("ActividadGrupalForm", () => {
  it("leaves activity types empty when the creator has no assigned team", () => {
    renderWithProviders(
      <ActividadGrupalForm
        mode="create"
        user={userWithoutTeam}
        error={null}
        formOptions={formOptions}
        isFormOptionsLoading={false}
        isPending={false}
        isTenantOptionsLoading={false}
        selectedTenantId={userWithoutTeam.tenantId ?? ""}
        shouldSelectTenant={false}
        tenantOptions={[]}
        onCancel={vi.fn()}
        onSubmit={vi.fn()}
        onTenantChange={vi.fn()}
      />,
    );

    expect(screen.getByLabelText("Tipo de actividad")).toBeDisabled();
    expect(screen.getByText("Debes tener un equipo asignado.")).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Actividades de Manualidad" })).toBeNull();
  });
});
