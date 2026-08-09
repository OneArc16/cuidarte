import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AdultoMayorListQuery, type AuthUser } from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";

import { AdultosMayoresController } from "./adultos-mayores.controller";
import { type ExportedAdultosMayoresFile } from "../application/adultos-mayores-export.service";

const currentUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const departmentId = "11111111-1111-1111-8111-111111111111";
const municipalityId = "22222222-2222-2222-8222-222222222222";
const epsId = "33333333-3333-4333-8333-333333333333";

describe("AdultosMayoresController exports", () => {
  it("passes create commands and current user to the service", async () => {
    const service = createAdultosMayoresService();
    const controller = new AdultosMayoresController(
      service as never,
      createExportService() as never,
    );
    const body = createCommandBody();

    const result = await controller.createAdultoMayor(body, { currentUser } as never);

    assert.deepEqual(service.createCalls[0], {
      command: {
        ...body,
        email: null,
        tenantId: null,
      },
      actor: currentUser,
    });
    assert.equal(result.documentNumber, body.documentNumber);
  });

  it("passes update commands and current user to the service", async () => {
    const service = createAdultosMayoresService();
    const controller = new AdultosMayoresController(
      service as never,
      createExportService() as never,
    );
    const body = createCommandBody();

    await controller.updateAdultoMayor("0b17e370-8f81-48c0-b707-c7046f497855", body, {
      currentUser,
    } as never);

    assert.deepEqual(service.updateCalls[0], {
      adultoMayorId: "0b17e370-8f81-48c0-b707-c7046f497855",
      command: {
        ...body,
        email: null,
      },
      actor: currentUser,
    });
  });

  it("passes the parsed query and current user to Excel exports", async () => {
    const exportService = createExportService();
    const controller = new AdultosMayoresController({} as never, exportService as never);
    const reply = createReply();

    await controller.exportExcel({ search: "  Rosa  " }, { currentUser } as never, reply);

    assert.deepEqual(exportService.excelCalls[0], {
      query: { search: "Rosa" },
      actor: currentUser,
    });
    assert.equal(reply.headers["Content-Type"], "application/octet-stream");
    assert.equal(
      reply.headers["Content-Disposition"],
      'attachment; filename="adultos-mayores.xlsx"',
    );
    assert.deepEqual(reply.payload, Buffer.from("excel"));
  });

  it("passes the parsed query and current user to PDF exports", async () => {
    const exportService = createExportService();
    const controller = new AdultosMayoresController({} as never, exportService as never);
    const reply = createReply();

    await controller.exportPdf({ search: "1020" }, { currentUser } as never, reply);

    assert.deepEqual(exportService.pdfCalls[0], {
      query: { search: "1020" },
      actor: currentUser,
    });
    assert.equal(
      reply.headers["Content-Disposition"],
      'attachment; filename="adultos-mayores.pdf"',
    );
    assert.deepEqual(reply.payload, Buffer.from("pdf"));
  });
});

function createAdultosMayoresService() {
  const createCalls: Array<{ command: unknown; actor: AuthUser }> = [];
  const updateCalls: Array<{ adultoMayorId: string; command: unknown; actor: AuthUser }> = [];

  return {
    createCalls,
    updateCalls,
    async createAdultoMayor(command: unknown, actor: AuthUser) {
      createCalls.push({ command, actor });

      return createDetail();
    },
    async updateAdultoMayor(adultoMayorId: string, command: unknown, actor: AuthUser) {
      updateCalls.push({ adultoMayorId, command, actor });

      return createDetail();
    },
  };
}

function createCommandBody() {
  return {
    documentType: "cc",
    documentNumber: "1020304050",
    sex: "female",
    firstName: "Rosa",
    middleName: "Elena",
    firstSurname: "Martinez",
    secondSurname: "Rojas",
    birthDate: "1948-03-12",
    educationLevel: "Primaria",
    disability: null,
    populationGroup: "Persona mayor",
    address: "Calle 45 # 18-20",
    departmentId,
    municipalityId,
    zone: "urban",
    country: "Colombia",
    phone: "3105550101",
    phoneSecondary: null,
    email: "",
    emergencyContactFullName: "Mariana Rojas",
    emergencyContactRelationship: "Hija",
    emergencyContactPhone: "3105552211",
    emergencyContactAddress: "Calle 45 # 18-20",
    bloodType: "o_positive",
    sisben: "B2",
    healthRegime: "subsidized",
    epsId,
    livesWithSomeone: true,
    companion: "Mariana Rojas",
    economicIncome: 450000,
    socialProgramBeneficiary: true,
  };
}

function createDetail() {
  return {
    id: "0b17e370-8f81-48c0-b707-c7046f497855",
    tenantId: "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054",
    tenantName: "Centro de Vida Demo",
    documentType: "cc",
    documentNumber: "1020304050",
    names: "Rosa Elena",
    surnames: "Martinez Rojas",
    firstName: "Rosa",
    middleName: "Elena",
    firstSurname: "Martinez",
    secondSurname: "Rojas",
    phone: "3105550101",
    phoneSecondary: null,
    email: null,
    birthDate: "1948-03-12",
    age: 78,
    sex: "female",
    educationLevel: "Primaria",
    disability: null,
    populationGroup: "Persona mayor",
    address: "Calle 45 # 18-20",
    department: "Cundinamarca",
    municipality: "Bogota",
    departmentId,
    municipalityId,
    zone: "urban",
    country: "Colombia",
    emergencyContactFullName: "Mariana Rojas",
    emergencyContactRelationship: "Hija",
    emergencyContactPhone: "3105552211",
    emergencyContactAddress: "Calle 45 # 18-20",
    bloodType: "o_positive",
    sisben: "B2",
    healthRegime: "subsidized",
    epsId,
    epsName: "Salud Demo",
    eps: "Salud Demo",
    livesWithSomeone: true,
    companion: "Mariana Rojas",
    economicIncome: 450000,
    socialProgramBeneficiary: true,
    createdAt: "2026-04-21T12:00:00.000Z",
    updatedAt: "2026-04-21T12:00:00.000Z",
  };
}

function createExportService() {
  const excelCalls: Array<{ query: AdultoMayorListQuery; actor: AuthUser }> = [];
  const pdfCalls: Array<{ query: AdultoMayorListQuery; actor: AuthUser }> = [];

  return {
    excelCalls,
    pdfCalls,
    async exportExcel(
      query: AdultoMayorListQuery,
      actor: AuthUser,
    ): Promise<ExportedAdultosMayoresFile> {
      excelCalls.push({ query, actor });

      return {
        buffer: Buffer.from("excel"),
        contentType: "application/octet-stream",
        filename: "adultos-mayores.xlsx",
      };
    },
    async exportPdf(
      query: AdultoMayorListQuery,
      actor: AuthUser,
    ): Promise<ExportedAdultosMayoresFile> {
      pdfCalls.push({ query, actor });

      return {
        buffer: Buffer.from("pdf"),
        contentType: "application/pdf",
        filename: "adultos-mayores.pdf",
      };
    },
  };
}

function createReply(): FastifyReply & {
  headers: Record<string, string>;
  payload: Buffer | null;
} {
  const reply: {
    headers: Record<string, string>;
    payload: Buffer | null;
    header: (name: string, value: string) => typeof reply;
    send: (payload: Buffer) => typeof reply;
  } = {
    headers: {},
    payload: null,
    header(name: string, value: string) {
      reply.headers[name] = value;

      return reply;
    },
    send(payload: Buffer) {
      reply.payload = payload;

      return reply;
    },
  };

  return reply as unknown as FastifyReply & {
    headers: Record<string, string>;
    payload: Buffer | null;
  };
}
