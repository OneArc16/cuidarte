import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ForbiddenException } from "@nestjs/common";

import { calculateAgeFromBirthDate } from "./age";
import { AdultosMayoresService } from "./adultos-mayores.service";
import {
  type AdultoMayorRecord,
  type FindAdultosMayoresQuery,
  type FindAdultosMayoresTrashQuery,
  type RestoreAdultoMayorCommand,
  type SendAdultoMayorToTrashCommand,
} from "../domain/adulto-mayor.types";
import { type AdultosMayoresRepository } from "../domain/adultos-mayores.repository";
import { type AdultosMayoresFilesStorage } from "../domain/adultos-mayores-files.storage";
import { type UbicacionesService } from "../../ubicaciones/application/ubicaciones.service";
import { type EpsService } from "../../eps/application/eps.service";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";
const departmentId = "11111111-1111-1111-8111-111111111111";
const municipalityId = "22222222-2222-2222-8222-222222222222";
const epsId = "33333333-3333-4333-8333-333333333333";

const tenantAdminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const tenantAuditorUser: AuthUser = {
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  tenantId,
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
  passwordSetByAdmin: true,
};

const tenantDeleteUser: AuthUser = {
  ...tenantAdminUser,
  permissions: ["adultos_mayores.delete"],
};

const superAdminUser: AuthUser = {
  ...tenantAdminUser,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  role: "super_admin",
};

const records: AdultoMayorRecord[] = [
  {
    id: "0b17e370-8f81-48c0-b707-c7046f497855",
    tenantId,
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
    email: "rosa.martinez@example.test",
    birthDate: "1948-03-12",
    sex: "female",
    status: "alive",
    deathDate: null,
    educationLevel: "Primaria",
    disability: null,
    populationGroup: "Persona mayor",
    address: "Calle 45 # 18-20",
    departmentId,
    municipalityId,
    department: "Cundinamarca",
    municipality: "Bogota",
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
    documentFile: null,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    updatedAt: new Date("2026-04-21T12:00:00.000Z"),
  },
  {
    id: "bfc12a6e-3309-4cf1-9dec-e0b22a68da40",
    tenantId: otherTenantId,
    tenantName: "Centro Norte",
    documentType: "ce",
    documentNumber: "CE908070",
    names: "Carmen Lucia",
    surnames: "Herrera Solano",
    firstName: "Carmen",
    middleName: "Lucia",
    firstSurname: "Herrera",
    secondSurname: "Solano",
    phone: null,
    phoneSecondary: null,
    email: null,
    birthDate: "1951-06-04",
    sex: "female",
    status: "alive",
    deathDate: null,
    educationLevel: null,
    disability: null,
    populationGroup: "Persona mayor",
    address: "Vereda El Jardin",
    departmentId,
    municipalityId,
    department: "Cundinamarca",
    municipality: "Soacha",
    zone: "rural",
    country: "Colombia",
    emergencyContactFullName: null,
    emergencyContactRelationship: null,
    emergencyContactPhone: null,
    emergencyContactAddress: null,
    bloodType: "unknown",
    sisben: null,
    healthRegime: "unknown",
    epsId: null,
    epsName: null,
    eps: null,
    livesWithSomeone: true,
    companion: "Vecina cuidadora",
    economicIncome: null,
    socialProgramBeneficiary: true,
    documentFile: null,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    updatedAt: new Date("2026-04-21T12:00:00.000Z"),
  },
];

describe("AdultosMayoresService", () => {
  it("scopes tenant users to their own tenant", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.listAdultosMayores({ search: "rosa" }, tenantAdminUser);

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, tenantId);
    assert.deepEqual(repository.queries[0], {
      search: "rosa",
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows SuperAdmin users to list all tenants", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.listAdultosMayores({ search: null }, superAdminUser);

    assert.equal(result.length, 2);
    assert.deepEqual(repository.queries[0], {
      search: null,
      scope: { type: "all" },
    });
  });

  it("allows auditor users to list records from their tenant", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.listAdultosMayores({ search: null }, tenantAuditorUser);

    assert.equal(result.length, 1);
    assert.deepEqual(repository.queries[0], {
      search: null,
      scope: { type: "tenant", tenantId },
    });
  });

  it("throws when a non SuperAdmin user has no tenant", async () => {
    const repository = createRepository();
    const service = createService(repository);

    await assert.rejects(
      () =>
        service.listAdultosMayores(
          { search: null },
          {
            ...tenantAdminUser,
            tenantId: null,
          },
        ),
      { constructor: ForbiddenException },
    );
  });

  it("creates adultos mayores in the actor tenant", async () => {
    const repository = createRepository();
    const service = createService(repository);

    const result = await service.createAdultoMayor(createCommand(), tenantAdminUser);

    assert.equal(result.tenantId, tenantId);
    assert.equal(result.documentNumber, "1099887766");
    assert.equal(result.firstName, "Julia");
    assert.equal(result.names, "Julia Mercedes");
  });

  it("updates adultos mayores scoped to the actor tenant", async () => {
    const repository = createRepository();
    const service = createService(repository);
    const currentRecord = records[0];

    assert.ok(currentRecord);

    const result = await service.updateAdultoMayor(
      currentRecord.id,
      {
        ...createCommand(),
        documentNumber: currentRecord.documentNumber,
        firstName: "Rosa",
        middleName: "Maria",
        firstSurname: "Martinez",
        secondSurname: "Rojas",
      },
      tenantAdminUser,
    );

    assert.equal(result.id, currentRecord.id);
    assert.equal(result.names, "Rosa Maria");
    assert.equal(result.surnames, "Martinez Rojas");
  });

  it("forbids auditor users from creating or updating adults records", async () => {
    const repository = createRepository();
    const service = createService(repository);
    const currentRecord = records[0];

    assert.ok(currentRecord);

    await assert.rejects(() => service.createAdultoMayor(createCommand(), tenantAuditorUser), {
      constructor: ForbiddenException,
    });

    await assert.rejects(
      () => service.updateAdultoMayor(currentRecord.id, createCommand(), tenantAuditorUser),
      { constructor: ForbiddenException },
    );
  });

  it("allows only SuperAdmin users to send an adulto mayor to trash", async () => {
    const repository = createRepository();
    const service = createService(repository);
    const currentRecord = records[0]!;

    await service.sendAdultoMayorToTrash(
      currentRecord.id,
      { reason: "Registro duplicado" },
      superAdminUser,
    );

    await assert.rejects(
      () =>
        service.sendAdultoMayorToTrash(
          currentRecord.id,
          { reason: "Registro duplicado" },
          tenantAdminUser,
        ),
      { constructor: ForbiddenException },
    );
  });

  it("scopes trash listing and mutations to the actor's center", async () => {
    const repository = createRepository();
    const service = createService(repository);
    const currentRecord = records[0]!;

    await service.listTrashAdultosMayores({ search: null }, tenantDeleteUser);
    assert.deepEqual(repository.trashQueries[0], {
      search: null,
      scope: { type: "tenant", tenantId },
    });

    await service.sendAdultoMayorToTrash(
      currentRecord.id,
      { reason: "Registro duplicado" },
      tenantDeleteUser,
    );
    assert.deepEqual(repository.trashCommands[0], {
      id: currentRecord.id,
      actorUserId: tenantDeleteUser.id,
      tenantId,
      reason: "Registro duplicado",
    });

    await service.restoreAdultoMayor(currentRecord.id, tenantDeleteUser);
    assert.deepEqual(repository.restoreCommands[0], {
      id: currentRecord.id,
      actorUserId: tenantDeleteUser.id,
      tenantId,
    });
  });

  it("allows only SuperAdmin users to restore an adulto mayor", async () => {
    const repository = createRepository();
    const service = createService(repository);
    const currentRecord = records[0]!;

    await service.restoreAdultoMayor(currentRecord.id, superAdminUser);

    await assert.rejects(() => service.restoreAdultoMayor(currentRecord.id, tenantAdminUser), {
      constructor: ForbiddenException,
    });
  });

  it("calculates age from birth date", () => {
    assert.equal(calculateAgeFromBirthDate("1948-03-12", new Date("2026-04-22T12:00:00Z")), 78);
    assert.equal(calculateAgeFromBirthDate("1948-10-12", new Date("2026-04-22T12:00:00Z")), 77);
  });
});

function createCommand() {
  return {
    tenantId: null,
    documentType: "cc" as const,
    documentNumber: "1099887766",
    sex: "female" as const,
    status: "alive" as const,
    deathDate: null,
    firstName: "Julia",
    middleName: "Mercedes",
    firstSurname: "Lopez",
    secondSurname: "Cano",
    birthDate: "1949-02-18",
    educationLevel: "Primaria",
    disability: null,
    populationGroup: "Persona mayor",
    address: "Calle 70 # 10-20",
    departmentId,
    municipalityId,
    department: "Cundinamarca",
    municipality: "Bogota",
    zone: "urban" as const,
    country: "Colombia",
    phone: "3105559090",
    phoneSecondary: null,
    email: null,
    emergencyContactFullName: "Ana Cano",
    emergencyContactRelationship: "Hija",
    emergencyContactPhone: "3105558080",
    emergencyContactAddress: "Calle 70 # 10-20",
    bloodType: "unknown" as const,
    sisben: null,
    healthRegime: "subsidized" as const,
    epsId,
    livesWithSomeone: true,
    companion: "Ana Cano",
    economicIncome: 300000,
    socialProgramBeneficiary: false,
    documentFile: null,
  };
}

function createRepository(): AdultosMayoresRepository & {
  queries: FindAdultosMayoresQuery[];
  trashQueries: FindAdultosMayoresTrashQuery[];
  trashCommands: SendAdultoMayorToTrashCommand[];
  restoreCommands: RestoreAdultoMayorCommand[];
} {
  const queries: FindAdultosMayoresQuery[] = [];
  const trashQueries: FindAdultosMayoresTrashQuery[] = [];
  const trashCommands: SendAdultoMayorToTrashCommand[] = [];
  const restoreCommands: RestoreAdultoMayorCommand[] = [];
  const storedRecords = records.map((record) => ({ ...record }));

  return {
    queries,
    trashQueries,
    trashCommands,
    restoreCommands,
    async findMany(query) {
      queries.push(query);

      if (query.scope.type === "tenant") {
        const scopedTenantId = query.scope.tenantId;

        return storedRecords.filter((record) => record.tenantId === scopedTenantId);
      }

      return storedRecords;
    },
    async findTrashMany(query) {
      trashQueries.push(query);
      return [];
    },
    async findById(query) {
      const record = storedRecords.find((candidate) => candidate.id === query.id) ?? null;

      if (record === null || query.scope.type === "all") {
        return record;
      }

      return record.tenantId === query.scope.tenantId ? record : null;
    },
    async findStatusHistory() {
      return { entries: [], nextCursor: null };
    },
    async findByDocument(query) {
      return (
        storedRecords.find(
          (record) =>
            record.tenantId === query.tenantId &&
            record.documentType === query.documentType &&
            record.documentNumber === query.documentNumber &&
            record.id !== query.excludeId,
        ) ?? null
      );
    },
    async findTenantOptions() {
      return [{ id: tenantId, name: "Centro de Vida Demo" }];
    },
    async create(command) {
      const record: AdultoMayorRecord = {
        id: "25ce51a5-f0a6-4374-a6b4-815348cbd26d",
        tenantName: "Centro de Vida Demo",
        names: [command.firstName, command.middleName].filter(Boolean).join(" "),
        surnames: [command.firstSurname, command.secondSurname].filter(Boolean).join(" "),
        createdAt: new Date("2026-04-22T12:00:00.000Z"),
        updatedAt: new Date("2026-04-22T12:00:00.000Z"),
        ...command,
        epsName: command.epsId === null ? null : "Salud Demo",
        eps: command.epsId === null ? null : "Salud Demo",
        documentFile: null,
      };

      storedRecords.push(record);

      return record;
    },
    async update(command) {
      const currentRecord = storedRecords.find((record) => record.id === command.id);

      if (currentRecord === undefined) {
        throw new Error("No encontrado.");
      }

      const updatedRecord: AdultoMayorRecord = {
        ...currentRecord,
        ...command,
        names: [command.firstName, command.middleName].filter(Boolean).join(" "),
        surnames: [command.firstSurname, command.secondSurname].filter(Boolean).join(" "),
        updatedAt: new Date("2026-04-22T12:00:00.000Z"),
        epsName: command.epsId === null ? null : "Salud Demo",
        eps: command.epsId === null ? null : "Salud Demo",
      };

      storedRecords.splice(storedRecords.indexOf(currentRecord), 1, updatedRecord);

      return updatedRecord;
    },
    async sendToTrash(command) {
      trashCommands.push(command);
      return true;
    },
    async restore(command) {
      restoreCommands.push(command);
      return true;
    },
    async findDocumentByAdultoId() {
      return null;
    },
    async saveDocument(document) {
      return document;
    },
    async deleteDocument() {
      return null;
    },
  };
}

function createService(repository: AdultosMayoresRepository): AdultosMayoresService {
  return new AdultosMayoresService(
    repository,
    createUbicacionesService() as UbicacionesService,
    createEpsService() as EpsService,
    createFilesStorage() as AdultosMayoresFilesStorage,
  );
}

function createFilesStorage(): Pick<
  AdultosMayoresFilesStorage,
  "savePdf" | "readFile" | "deleteFile"
> {
  return {
    async savePdf(_adultoMayorId, file) {
      return {
        originalName: file.originalName,
        mimeType: "application/pdf",
        sizeBytes: file.sizeBytes,
        relativePath: "test/document.pdf",
      };
    },
    async readFile() {
      return Buffer.from("pdf");
    },
    async deleteFile() {},
  };
}

function createEpsService(): Pick<EpsService, "resolveForWrite"> {
  return {
    async resolveForWrite(requestedEpsId: string | null) {
      if (requestedEpsId === null) {
        return null;
      }

      if (requestedEpsId !== epsId) {
        throw new Error("EPS invalida en el test.");
      }

      return { id: epsId, name: "Salud Demo" };
    },
  };
}

function createUbicacionesService(): Pick<UbicacionesService, "resolveDepartmentMunicipalityPair"> {
  return {
    async resolveDepartmentMunicipalityPair(
      requestedDepartmentId: string,
      requestedMunicipalityId: string,
    ) {
      if (requestedDepartmentId !== departmentId || requestedMunicipalityId !== municipalityId) {
        throw new Error("Ubicacion invalida en el test.");
      }

      return {
        department: {
          id: departmentId,
          name: "Cundinamarca",
        },
        municipality: {
          id: municipalityId,
          departmentId,
          name: "Bogota",
        },
      };
    },
  };
}
