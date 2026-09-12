import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type ActividadGrupalDiligenciamientoDetail } from "@cuidarte/contracts";

import { hydrateActividadGrupalActaPdfDetailWithSignatures } from "./actividades-grupales-acta-export.service";

describe("ActividadesGrupalesActaExportService", () => {
  it("hydrates assigned professional signatures for the acta pdf", async () => {
    const detail = await hydrateActividadGrupalActaPdfDetailWithSignatures(createDetail(), {
      empleadosRepository: {
        async findLatestSignatureVersionByEmployeeId(employeeId: string) {
          if (employeeId === "profesional-1") {
            return {
              id: "firma-1",
              employeeId,
              tenantId: "tenant-1",
              originalName: "firma.png",
              mimeType: "image/png",
              sizeBytes: 123,
              checksum: "a".repeat(64),
              relativePath: "tenant-1/profesional-1/signatures/firma.png",
              createdAt: new Date("2026-08-16T10:00:00.000Z"),
            };
          }

          return null;
        },
      },
      empleadosSignatureService: {
        async readSignatureFile() {
          return {
            buffer: Buffer.from("firma"),
            contentType: "image/png",
            originalName: "firma.png",
          };
        },
      },
    });

    assert.equal(
      detail.assignedProfessionals[0]?.signatureDataUrl,
      "data:image/png;base64,ZmlybWE=",
    );
    assert.equal(detail.assignedProfessionals[1]?.signatureDataUrl, null);
  });
});

function createDetail(): ActividadGrupalDiligenciamientoDetail {
  return {
    id: "actividad-1",
    tenantId: "tenant-1",
    tenantName: "Centro Demo",
    actaNumber: "0001",
    actaOrganizer: "director",
    actaSequence: 1,
    previousActaNumber: null,
    activityName: "Sesion de prueba",
    activityType: "salud_preventiva",
    activityDate: "2026-08-16",
    startTime: "09:00",
    endTime: "10:00",
    organizer: "director",
    involvedEmployeesCount: 2,
    canEdit: true,
    canDelete: true,
    createdAt: "2026-08-16T10:00:00.000Z",
    updatedAt: "2026-08-16T10:00:00.000Z",
    assignedProfessionals: [
      {
        id: "profesional-1",
        fullName: "Ana Milena",
        role: "director",
      },
      {
        id: "profesional-2",
        fullName: "Laura Perez",
        role: "recreacionista",
      },
    ],
    objectives: "Objetivos",
    development: "Desarrollo",
    conclusion: "Conclusion",
    responsibleDepartment: "direccion",
    integrantes: [],
    photoFiles: [],
    pdfFile: null,
    diligenciamientoCreatedAt: null,
    diligenciamientoUpdatedAt: null,
  };
}
