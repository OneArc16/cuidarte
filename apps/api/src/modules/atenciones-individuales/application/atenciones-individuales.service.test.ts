import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { AtencionesIndividualesService } from "./atenciones-individuales.service";
import {
  type AtencionIndividualAdultoRecord,
  type AtencionIndividualHistoryItemRecord,
  type AtencionIndividualRecord,
  type BufferedAtencionIndividualUpload,
  type CreateAtencionIndividualRecordCommand,
  type FindAtencionIndividualAdultoByIdQuery,
  type FindAtencionIndividualByConsecutiveQuery,
  type FindAtencionIndividualByIdQuery,
  type FindAtencionIndividualHistoryByAdultoMayorQuery,
  type UpdateAtencionIndividualRecordCommand,
} from "../domain/atencion-individual.types";
import { type AtencionesIndividualesFilesStorage } from "../domain/atenciones-individuales-files.storage";
import { type AtencionesIndividualesRepository } from "../domain/atenciones-individuales.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const atencionId = "2ef00f9e-9a85-47d7-91a4-7030d6f6f951";

const medicoUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
};

const psicologoUser: AuthUser = {
  ...medicoUser,
  id: "0d516183-3e18-40ba-90d0-f4e2e978bb9a",
  email: "psicologo@centro-demo.test",
  fullName: "Psicologo Centro Demo",
  role: "psicologo",
};

const adminUser: AuthUser = {
  ...medicoUser,
  id: "149ec0be-51c3-41a2-9175-2101c489ae47",
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
};

const directorUser: AuthUser = {
  ...medicoUser,
  id: "dcb4bafb-8470-43c8-81ab-76f51c0660f5",
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
};

const recreacionistaUser: AuthUser = {
  ...medicoUser,
  id: "e3ed2703-8307-4c6c-9cea-1b65ceccdb0f",
  email: "recreacion@centro-demo.test",
  fullName: "Recreacionista Centro Demo",
  role: "recreacionista",
};

const adultoRecord: AtencionIndividualAdultoRecord = {
  id: adultoMayorId,
  tenantId,
  tenantName: "Centro de Vida Demo",
  documentNumber: "1020304050",
  fullName: "Rosa Elena Martinez Rojas",
  birthDate: "1948-03-12",
  sex: "female",
  eps: "Salud Demo",
  healthRegime: "subsidized",
};

const atencionRecord: AtencionIndividualRecord = {
  id: atencionId,
  tenantId,
  tenantName: adultoRecord.tenantName,
  adultoMayorId,
  attentionDate: "2026-04-24",
  modalidad: "intramural",
  tipoConsulta: "primera_vez",
  nombreConsulta: "Atencion individual",
  consecutive: 1,
  finalidad: "resolutiva_atencion_general",
  causaExterna: "enfermedad_general",
  motivoConsulta: "Dolor general",
  enfermedadActual: "Paciente refiere dolor general.",
  antecedentesPersonales: null,
  antecedentesFamiliares: null,
  tensionSistolica: 120,
  tensionDiastolica: 80,
  frecuenciaCardiaca: null,
  frecuenciaRespiratoria: null,
  temperatura: null,
  saturacionOxigeno: null,
  pesoKg: null,
  tallaCm: null,
  imc: null,
  perimetroAbdominalCm: null,
  examenFisico: null,
  resultadosLaboratorios: null,
  resultadosProcedimientos: null,
  ordenesMedicas: [],
  diagnosticos: [
    {
      id: "diagnostico-1",
      codigoCie10: "I10",
      descripcion: "Hipertension esencial",
      tipo: "principal",
    },
  ],
  createdByUserId: medicoUser.id,
  updatedByUserId: medicoUser.id,
  createdAt: new Date("2026-04-24T12:00:00.000Z"),
  updatedAt: new Date("2026-04-24T12:00:00.000Z"),
  adultoMayor: adultoRecord,
  supportFiles: [],
};

const otherProfessionalAtencionRecord: AtencionIndividualRecord = {
  ...atencionRecord,
  id: "3f8c63f0-8915-42ee-96c8-0af15b2f26a6",
  createdByUserId: psicologoUser.id,
  updatedByUserId: psicologoUser.id,
};

const historyItemRecord: AtencionIndividualHistoryItemRecord = {
  id: atencionId,
  tenantId,
  tenantName: adultoRecord.tenantName,
  adultoMayorId,
  attentionDate: atencionRecord.attentionDate,
  modalidad: atencionRecord.modalidad,
  tipoConsulta: atencionRecord.tipoConsulta,
  nombreConsulta: atencionRecord.nombreConsulta,
  consecutive: atencionRecord.consecutive,
  createdByUserId: medicoUser.id,
  createdByUserFullName: medicoUser.fullName,
  createdByUserRole: medicoUser.role,
  createdAt: atencionRecord.createdAt,
  updatedAt: atencionRecord.updatedAt,
};

const otherProfessionalHistoryItemRecord: AtencionIndividualHistoryItemRecord = {
  ...historyItemRecord,
  id: "3f8c63f0-8915-42ee-96c8-0af15b2f26a6",
  consecutive: 2,
  createdByUserId: psicologoUser.id,
  createdByUserFullName: psicologoUser.fullName,
  createdByUserRole: psicologoUser.role,
};

describe("AtencionesIndividualesService", () => {
  it("preloads adult summary and suggested consecutive within tenant scope", async () => {
    const repository = createRepository();
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    const result = await service.lookupAdultoMayor(adultoMayorId, medicoUser);

    assert.equal(result.adultoMayor.id, adultoMayorId);
    assert.equal(result.adultoMayor.age, 78);
    assert.equal(result.suggestedConsecutive, 2);
    assert.deepEqual(repository.adultoQueries[0], {
      adultoMayorId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows authorized clinical roles to create attention records", async () => {
    const repository = createRepository();
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    const result = await service.createAtencion(createRequest(), psicologoUser);

    assert.equal(result.id, atencionId);
    assert.equal(repository.createdCommands[0]?.actorUserId, psicologoUser.id);
    assert.equal(repository.createdCommands[0]?.tenantId, tenantId);
  });

  it("rejects creation lookup and write operations for non clinical roles", async () => {
    const repository = createRepository();
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    await assert.rejects(() => service.lookupAdultoMayor(adultoMayorId, adminUser), {
      constructor: ForbiddenException,
    });
    await assert.rejects(() => service.createAtencion(createRequest(), adminUser), {
      constructor: ForbiddenException,
    });
  });

  it("filters historia clinica to the current professional and returns edit access", async () => {
    const repository = createRepository();
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    const result = await service.getHistoriaClinica(adultoMayorId, medicoUser);

    assert.equal(result.atenciones.length, 1);
    assert.equal(result.atenciones[0]?.professional.userId, medicoUser.id);
    assert.equal(result.atenciones[0]?.access, "edit");
    assert.deepEqual(repository.historyQueries[0], {
      adultoMayorId,
      scope: { type: "tenant", tenantId },
      createdByUserId: medicoUser.id,
    });
  });

  it("returns all attentions for admin and director in read-only mode", async () => {
    const repository = createRepository({
      historyRecords: [historyItemRecord, otherProfessionalHistoryItemRecord],
    });
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    const adminHistory = await service.getHistoriaClinica(adultoMayorId, adminUser);
    const directorHistory = await service.getHistoriaClinica(adultoMayorId, directorUser);

    assert.equal(adminHistory.atenciones.length, 2);
    assert.equal(adminHistory.atenciones[0]?.access, "view");
    assert.equal(adminHistory.atenciones[1]?.access, "view");
    assert.equal(directorHistory.atenciones.length, 2);
    assert.equal(repository.historyQueries[0]?.createdByUserId, undefined);
    assert.equal(repository.historyQueries[1]?.createdByUserId, undefined);
  });

  it("rejects historia clinica access for unsupported roles", async () => {
    const repository = createRepository();
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    await assert.rejects(() => service.getHistoriaClinica(adultoMayorId, recreacionistaUser), {
      constructor: ForbiddenException,
    });
  });

  it("rejects duplicate tenant consecutive values", async () => {
    const repository = createRepository({ existingByConsecutive: atencionRecord });
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    await assert.rejects(() => service.createAtencion(createRequest(), medicoUser), {
      constructor: ConflictException,
    });
  });

  it("updates an existing attention only when it belongs to the current professional", async () => {
    const repository = createRepository();
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    const result = await service.updateAtencion(
      atencionId,
      {
        ...createRequest(),
        nombreConsulta: "Control medico",
      },
      medicoUser,
    );

    assert.equal(result.nombreConsulta, "Control medico");
    assert.equal(repository.updatedCommands[0]?.id, atencionId);

    const foreignRepository = createRepository({ detail: otherProfessionalAtencionRecord });
    const foreignService = new AtencionesIndividualesService(
      foreignRepository,
      createFilesStorage(),
    );

    await assert.rejects(
      () =>
        foreignService.updateAtencion(
          otherProfessionalAtencionRecord.id,
          {
            ...createRequest(),
            nombreConsulta: "Intento ajeno",
          },
          medicoUser,
        ),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("allows admin to view any attention but blocks direct access from another professional", async () => {
    const adminRepository = createRepository({ detail: otherProfessionalAtencionRecord });
    const adminService = new AtencionesIndividualesService(adminRepository, createFilesStorage());

    const adminResult = await adminService.getAtencion(otherProfessionalAtencionRecord.id, adminUser);

    assert.equal(adminResult.id, otherProfessionalAtencionRecord.id);

    const professionalRepository = createRepository({ detail: otherProfessionalAtencionRecord });
    const professionalService = new AtencionesIndividualesService(
      professionalRepository,
      createFilesStorage(),
    );

    await assert.rejects(
      () => professionalService.getAtencion(otherProfessionalAtencionRecord.id, medicoUser),
      {
        constructor: ForbiddenException,
      },
    );
  });

  it("returns not found when the adult is outside scope", async () => {
    const repository = createRepository({ adulto: null });
    const service = new AtencionesIndividualesService(repository, createFilesStorage());

    await assert.rejects(() => service.getHistoriaClinica(adultoMayorId, adminUser), {
      constructor: NotFoundException,
    });
  });
});

function createRequest() {
  return {
    adultoMayorId,
    attentionDate: "2026-04-24",
    modalidad: "intramural" as const,
    tipoConsulta: "primera_vez" as const,
    nombreConsulta: "Atencion individual",
    consecutive: 1,
    finalidad: "resolutiva_atencion_general" as const,
    causaExterna: "enfermedad_general" as const,
    motivoConsulta: "Dolor general",
    enfermedadActual: "Paciente refiere dolor general.",
    antecedentesPersonales: null,
    antecedentesFamiliares: null,
    tensionSistolica: 120,
    tensionDiastolica: 80,
    frecuenciaCardiaca: null,
    frecuenciaRespiratoria: null,
    temperatura: null,
    saturacionOxigeno: null,
    pesoKg: null,
    tallaCm: null,
    imc: null,
    perimetroAbdominalCm: null,
    examenFisico: null,
    resultadosLaboratorios: null,
    resultadosProcedimientos: null,
    ordenesMedicas: [],
    diagnosticos: atencionRecord.diagnosticos,
  };
}

function createRepository(
  options: {
    adulto?: AtencionIndividualAdultoRecord | null;
    detail?: AtencionIndividualRecord | null;
    existingByConsecutive?: AtencionIndividualRecord | null;
    historyRecords?: AtencionIndividualHistoryItemRecord[];
  } = {},
) {
  const repository = {
    adultoQueries: [] as FindAtencionIndividualAdultoByIdQuery[],
    historyQueries: [] as FindAtencionIndividualHistoryByAdultoMayorQuery[],
    detailQueries: [] as FindAtencionIndividualByIdQuery[],
    consecutiveQueries: [] as FindAtencionIndividualByConsecutiveQuery[],
    createdCommands: [] as CreateAtencionIndividualRecordCommand[],
    updatedCommands: [] as UpdateAtencionIndividualRecordCommand[],
    async findAdultoMayorById(query) {
      this.adultoQueries.push(query);
      return options.adulto === undefined ? adultoRecord : options.adulto;
    },
    async findHistoryByAdultoMayor(query) {
      this.historyQueries.push(query);
      const records =
        options.historyRecords === undefined
          ? [historyItemRecord]
          : options.historyRecords;

      if (query.createdByUserId === undefined) {
        return records;
      }

      return records.filter((record) => record.createdByUserId === query.createdByUserId);
    },
    async findById(query) {
      this.detailQueries.push(query);
      return options.detail === undefined ? atencionRecord : options.detail;
    },
    async findByConsecutive(query) {
      this.consecutiveQueries.push(query);
      return options.existingByConsecutive ?? null;
    },
    async peekNextConsecutive(tenantIdParam) {
      assert.equal(tenantIdParam, tenantId);
      return 2;
    },
    async create(command) {
      this.createdCommands.push(command);
      return {
        ...atencionRecord,
        ...command,
        adultoMayor: adultoRecord,
        createdByUserId: command.actorUserId,
        updatedByUserId: command.actorUserId,
        createdAt: atencionRecord.createdAt,
        updatedAt: atencionRecord.updatedAt,
        supportFiles: command.supportFiles.map((file, index) => ({
          ...file,
          id: `00000000-0000-4000-8000-00000000000${index}`,
          atencionId,
          createdAt: atencionRecord.createdAt,
        })),
      };
    },
    async update(command) {
      this.updatedCommands.push(command);
      return {
        record: {
          ...(options.detail ?? atencionRecord),
          ...command,
          tenantId,
          tenantName: atencionRecord.tenantName,
          adultoMayorId,
          adultoMayor: adultoRecord,
          createdByUserId: (options.detail ?? atencionRecord).createdByUserId,
          updatedByUserId: command.actorUserId,
          createdAt: (options.detail ?? atencionRecord).createdAt,
          updatedAt: new Date("2026-04-24T12:10:00.000Z"),
          supportFiles: command.supportFiles.map((file, index) => ({
            ...file,
            id: `00000000-0000-4000-8000-00000000001${index}`,
            atencionId,
            createdAt: new Date("2026-04-24T12:10:00.000Z"),
          })),
        },
        removedFiles: [],
      };
    },
  } satisfies AtencionesIndividualesRepository & {
    adultoQueries: FindAtencionIndividualAdultoByIdQuery[];
    historyQueries: FindAtencionIndividualHistoryByAdultoMayorQuery[];
    detailQueries: FindAtencionIndividualByIdQuery[];
    consecutiveQueries: FindAtencionIndividualByConsecutiveQuery[];
    createdCommands: CreateAtencionIndividualRecordCommand[];
    updatedCommands: UpdateAtencionIndividualRecordCommand[];
  };

  return repository;
}

function createFilesStorage(): AtencionesIndividualesFilesStorage {
  return {
    async saveFile(
      _atencion: { tenantId: string; atencionId: string },
      file: BufferedAtencionIndividualUpload,
    ) {
      return {
        originalName: file.originalName,
        mimeType: file.mimeType,
        sizeBytes: file.sizeBytes,
        relativePath: `soportes/${file.originalName}`,
      };
    },
    async readFile(_relativePath, originalName, contentType) {
      return {
        buffer: Buffer.from("file"),
        contentType,
        originalName,
      };
    },
    async deleteFile() {
      return undefined;
    },
  };
}
