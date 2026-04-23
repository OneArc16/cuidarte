import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { ForbiddenException } from "@nestjs/common";

import { calculateAgeFromBirthDate } from "./age";
import { AdultosMayoresService } from "./adultos-mayores.service";
import { type AdultoMayorRecord, type FindAdultosMayoresQuery } from "../domain/adulto-mayor.types";
import { type AdultosMayoresRepository } from "../domain/adultos-mayores.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";

const tenantAdminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
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
    educationLevel: "Primaria",
    disability: null,
    populationGroup: "Persona mayor",
    address: "Calle 45 # 18-20",
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
    eps: "Salud Demo",
    livesWithSomeone: true,
    companion: "Mariana Rojas",
    economicIncome: 450000,
    socialProgramBeneficiary: true,
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
    educationLevel: null,
    disability: null,
    populationGroup: "Persona mayor",
    address: "Vereda El Jardin",
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
    eps: null,
    livesWithSomeone: true,
    companion: "Vecina cuidadora",
    economicIncome: null,
    socialProgramBeneficiary: true,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    updatedAt: new Date("2026-04-21T12:00:00.000Z"),
  },
];

describe("AdultosMayoresService", () => {
  it("scopes tenant users to their own tenant", async () => {
    const repository = createRepository();
    const service = new AdultosMayoresService(repository);

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
    const service = new AdultosMayoresService(repository);

    const result = await service.listAdultosMayores({ search: null }, superAdminUser);

    assert.equal(result.length, 2);
    assert.deepEqual(repository.queries[0], {
      search: null,
      scope: { type: "all" },
    });
  });

  it("throws when a non SuperAdmin user has no tenant", async () => {
    const repository = createRepository();
    const service = new AdultosMayoresService(repository);

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
    const service = new AdultosMayoresService(repository);

    const result = await service.createAdultoMayor(createCommand(), tenantAdminUser);

    assert.equal(result.tenantId, tenantId);
    assert.equal(result.documentNumber, "1099887766");
    assert.equal(result.firstName, "Julia");
    assert.equal(result.names, "Julia Mercedes");
  });

  it("updates adultos mayores scoped to the actor tenant", async () => {
    const repository = createRepository();
    const service = new AdultosMayoresService(repository);
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
    firstName: "Julia",
    middleName: "Mercedes",
    firstSurname: "Lopez",
    secondSurname: "Cano",
    birthDate: "1949-02-18",
    educationLevel: "Primaria",
    disability: null,
    populationGroup: "Persona mayor",
    address: "Calle 70 # 10-20",
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
    eps: "Salud Demo",
    livesWithSomeone: true,
    companion: "Ana Cano",
    economicIncome: 300000,
    socialProgramBeneficiary: false,
  };
}

function createRepository(): AdultosMayoresRepository & { queries: FindAdultosMayoresQuery[] } {
  const queries: FindAdultosMayoresQuery[] = [];
  const storedRecords = records.map((record) => ({ ...record }));

  return {
    queries,
    async findMany(query) {
      queries.push(query);

      if (query.scope.type === "tenant") {
        const scopedTenantId = query.scope.tenantId;

        return storedRecords.filter((record) => record.tenantId === scopedTenantId);
      }

      return storedRecords;
    },
    async findById(query) {
      const record = storedRecords.find((candidate) => candidate.id === query.id) ?? null;

      if (record === null || query.scope.type === "all") {
        return record;
      }

      return record.tenantId === query.scope.tenantId ? record : null;
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
      };

      storedRecords.splice(storedRecords.indexOf(currentRecord), 1, updatedRecord);

      return updatedRecord;
    },
  };
}
