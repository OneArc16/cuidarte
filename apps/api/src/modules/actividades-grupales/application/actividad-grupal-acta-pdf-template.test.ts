import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  type ActividadGrupalActaPdfDetail,
  buildActividadGrupalActaPdfHtml,
  buildActividadGrupalActaPhotoEvidencePdfHtml,
  buildActividadGrupalActaPdfFilename,
} from "./actividad-grupal-acta-pdf-template";

describe("actividad-grupal-acta-pdf-template", () => {
  it("renders the photo evidence section only when photos exist", () => {
    const htmlWithoutPhotos = buildActividadGrupalActaPdfHtml({
      detail: createDetail(),
      logoDataUrl: null,
      photoAssets: [],
    });
    const htmlWithPhotos = buildActividadGrupalActaPdfHtml({
      detail: createDetail(),
      logoDataUrl: "data:image/png;base64,bG9nbw==",
      photoAssets: [
        {
          id: "photo-1",
          originalName: 'foto <1> "prueba".png',
          dataUrl: "data:image/jpeg;base64,Zm9v",
        },
        {
          id: "photo-2",
          originalName: "foto 2.png",
          dataUrl: "data:image/jpeg;base64,YmFy",
        },
      ],
    });

    assert.doesNotMatch(htmlWithoutPhotos, /EVIDENCIA FOTOGRAFICA/);
    assert.doesNotMatch(
      htmlWithoutPhotos,
      /<section class="acta-document__section acta-document__section--photo-evidence">/,
    );
    assert.match(htmlWithPhotos, /EVIDENCIA FOTOGRAFICA/);
    assert.match(htmlWithPhotos, /break-before: page/);
    assert.match(htmlWithPhotos, /object-fit: contain/);
    assert.match(
      htmlWithPhotos,
      /alt="Fotografia adjunta: foto &lt;1&gt; &quot;prueba&quot;\.png"/,
    );
    assert.ok(htmlWithPhotos.indexOf("foto &lt;1&gt;") < htmlWithPhotos.indexOf("foto 2.png"));
  });

  it("renders a standalone photo evidence document without forcing a page break", () => {
    const html = buildActividadGrupalActaPhotoEvidencePdfHtml([
      {
        id: "photo-1",
        originalName: "foto cierre.png",
        dataUrl: "data:image/jpeg;base64,Zm9v",
      },
    ]);

    assert.match(html, /EVIDENCIA FOTOGRAFICA/);
    assert.match(html, /foto cierre\.png/);
    assert.doesNotMatch(
      html,
      /<section class="acta-document__section acta-document__section--photo-evidence">/,
    );
  });

  it("builds a sanitized filename", () => {
    assert.equal(
      buildActividadGrupalActaPdfFilename(createDetail({ actaNumber: "10 20/30" })),
      "acta-sesion-grupal-10-20-30.pdf",
    );
  });

  it("uses page margins so split tables do not touch the page edge", () => {
    const html = buildActividadGrupalActaPdfHtml({
      detail: createDetail(),
      logoDataUrl: null,
      photoAssets: [],
    });

    assert.match(html, /@page\s*{[^}]*margin: 12mm;/);
    assert.match(html, /padding: 0;/);
  });

  it("renders assigned professional signatures inside the signature column", () => {
    const html = buildActividadGrupalActaPdfHtml({
      detail: createDetail({
        responsibleDepartment: "direccion",
        assignedProfessionals: [
          {
            id: "profesional-1",
            fullName: "Ana Milena",
            role: "director",
            signatureDataUrl: "data:image/png;base64,ZmlybWE=",
          },
        ],
      }),
      logoDataUrl: null,
      photoAssets: [],
    });

    assert.match(html, /alt="Firma de Ana Milena"/);
    assert.match(html, /src="data:image\/png;base64,ZmlybWE="/);
    assert.match(html, /acta-document__people-table--professionals/);
  });

  it("renders each professional's own role instead of the responsible department", () => {
    const html = buildActividadGrupalActaPdfHtml({
      detail: createDetail({
        responsibleDepartment: "enfermeria",
        assignedProfessionals: [
          {
            id: "profesional-1",
            fullName: "Daniel Castaño",
            role: "medico",
            signatureDataUrl: null,
          },
          {
            id: "profesional-2",
            fullName: "Danna Núñez",
            role: "psicologo",
            signatureDataUrl: null,
          },
        ],
      }),
      logoDataUrl: null,
      photoAssets: [],
    });

    assert.match(html, /<td>Daniel Castaño<\/td><td>Medico<\/td>/);
    assert.match(html, /<td>Danna Núñez<\/td><td>Psicologo<\/td>/);
    assert.doesNotMatch(html, /<td>Enfermeria<\/td>/);
  });

  it("omits the attendee section when no integrantes are registered", () => {
    const html = buildActividadGrupalActaPdfHtml({
      detail: createDetail({ integrantes: [] }),
      logoDataUrl: null,
      photoAssets: [],
    });

    assert.doesNotMatch(html, /LISTADO DE ASISTENTES/);
    assert.doesNotMatch(html, /acta-document__people-table--attendees/);
  });

  it("renders the attendee section when integrantes are registered", () => {
    const html = buildActividadGrupalActaPdfHtml({
      detail: createDetail({
        integrantes: [
          {
            id: "integrante-1",
            fullName: "Ana Leonor Florian de Moreno",
            documentNumber: "26783623",
          },
        ],
      }),
      logoDataUrl: null,
      photoAssets: [],
    });

    assert.match(html, /LISTADO DE ASISTENTES/);
    assert.match(html, /Ana Leonor Florian de Moreno/);
    assert.match(html, /26783623/);
  });
});

function createDetail(
  overrides: Partial<ActividadGrupalActaPdfDetail> = {},
): ActividadGrupalActaPdfDetail {
  return {
    id: "f3e7f0dc-7d48-4b1e-bcf4-d2bde9cfd111",
    tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    tenantName: "Centro de Vida Demo",
    actaNumber: "0007",
    activityName: "Sesion grupal de ejemplo",
    activityType: "salud_preventiva",
    activityDate: "2026-04-23",
    startTime: "08:00",
    endTime: "10:00",
    organizer: "director",
    involvedEmployeesCount: 2,
    canEdit: true,
    canDelete: true,
    createdAt: "2026-04-23T12:00:00.000Z",
    updatedAt: "2026-04-23T12:00:00.000Z",
    assignedProfessionals: [],
    objectives: "Objetivo de ejemplo",
    development: "Desarrollo de ejemplo",
    conclusion: "Conclusion de ejemplo",
    responsibleDepartment: null,
    integrantes: [],
    photoFiles: [],
    pdfFile: null,
    diligenciamientoCreatedAt: null,
    diligenciamientoUpdatedAt: null,
    ...overrides,
  };
}
