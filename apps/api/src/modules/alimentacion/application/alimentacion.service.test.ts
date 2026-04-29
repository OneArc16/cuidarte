import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";

import { AlimentacionService } from "./alimentacion.service";
import {
  type AlimentacionAdultoOptionRecord,
  type AlimentacionRecord,
  type FindAlimentacionRecordsQuery,
  type SearchAlimentacionAdultosMayoresOptionsQuery,
} from "../domain/alimentacion.types";
import { type AlimentacionRepository } from "../domain/alimentacion.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";
const adultoMayorId = "0b17e370-8f81-48c0-b707-c7046f497855";
const existingRecordId = "1a3782f0-b999-412c-a0f4-31ed47cb8f3f";

const adminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const auditorUser: AuthUser = {
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  tenantId,
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
  passwordSetByAdmin: true,
};

const superAdminUser: AuthUser = {
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "Super Admin",
  role: "super_admin",
  passwordSetByAdmin: true,
};

const directorUser: AuthUser = {
  id: "7b820700-fd7d-4b2e-9d61-2e4bca413c8a",
  tenantId,
  email: "director@centro-demo.test",
  fullName: "Director Centro Demo",
  role: "director",
  passwordSetByAdmin: true,
};

const tenantlessDirectorUser: AuthUser = {
  id: "7b820700-fd7d-4b2e-9d61-2e4bca413c8a",
  tenantId: null,
  email: "director@sin-centro.test",
  fullName: "Director Sin Centro",
  role: "director",
  passwordSetByAdmin: true,
};

const medicoUser: AuthUser = {
  id: "eaebfa34-4ef2-4b10-b8a5-1db6d494a2a2",
  tenantId,
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
  passwordSetByAdmin: true,
};

const adultoMayorRecord: AlimentacionAdultoOptionRecord = {
  id: adultoMayorId,
  tenantId,
  tenantName: "Centro de Vida Demo",
  documentNumber: "1020304050",
  fullName: "Rosa Elena Martinez Rojas",
};

const alimentacionRecord: AlimentacionRecord = {
  id: existingRecordId,
  tenantId,
  tenantName: "Centro de Vida Demo",
  adultoMayorId,
  documentNumber: "1020304050",
  fullName: "Rosa Elena Martinez Rojas",
  deliveryDate: "2026-04-24",
  organizer: "nutricionista",
  refrigerio1: "entregado",
  almuerzo: "entregado",
  refrigerio2: "no_aplica",
  auxilioTransporte: "no_entregado",
  createdAt: new Date("2026-04-24T12:00:00.000Z"),
  updatedAt: new Date("2026-04-24T12:00:00.000Z"),
};

describe("AlimentacionService", () => {
  it("allows tenant users to list records within their scope", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    const result = await service.listRegistros(
      { search: "Rosa", deliveryDate: "2026-04-24", tenantId: null },
      adminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, tenantId);
    assert.deepEqual(repository.listQueries[0], {
      search: "Rosa",
      deliveryDate: "2026-04-24",
      tenantId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows auditor users to list records in tenant scope", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    const result = await service.listRegistros(
      { search: null, deliveryDate: "2026-04-24", tenantId: null },
      auditorUser,
    );

    assert.equal(result.length, 1);
    assert.deepEqual(repository.listQueries[0], {
      search: null,
      deliveryDate: "2026-04-24",
      tenantId,
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows super admin users to filter the list by tenant", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    await service.listRegistros(
      { search: null, deliveryDate: "2026-04-24", tenantId: otherTenantId },
      superAdminUser,
    );

    assert.deepEqual(repository.listQueries[0], {
      search: null,
      deliveryDate: "2026-04-24",
      tenantId: otherTenantId,
      scope: { type: "all" },
    });
  });

  it("allows director users to create feeding batches within their tenant", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    const result = await service.createBatch(
      {
        tenantId: null,
        deliveryDate: "2026-04-24",
        organizer: "director",
        registros: [
          {
            adultoMayorId,
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "no_aplica",
            auxilioTransporte: "no_entregado",
          },
        ],
      },
      directorUser,
    );

    assert.equal(result.createdCount, 1);
    assert.equal(repository.createdCommands[0]?.tenantId, tenantId);
    assert.equal(repository.createdCommands[0]?.actorUserId, directorUser.id);
  });

  it("requires a tenant selection when super admin searches adults for a batch", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    await assert.rejects(
      () =>
        service.searchAdultosMayoresOptions(
          {
            search: "Rosa",
            deliveryDate: "2026-04-24",
            tenantId: null,
          },
          superAdminUser,
        ),
      { constructor: BadRequestException },
    );
  });

  it("searches feeding batch adults by document number", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    const result = await service.searchAdultosMayoresOptions(
      {
        search: "1020304050",
        deliveryDate: "2026-04-24",
        tenantId: null,
      },
      adminUser,
    );

    assert.equal(result.length, 1);
    assert.equal(result[0]?.documentNumber, "1020304050");
    assert.deepEqual(repository.adultoOptionsQueries[0], {
      tenantId,
      deliveryDate: "2026-04-24",
      search: "1020304050",
    });
  });

  it("creates a batch with tenant adults and no duplicates", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    const result = await service.createBatch(
      {
        tenantId: null,
        deliveryDate: "2026-04-24",
        organizer: "nutricionista",
        registros: [
          {
            adultoMayorId,
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "no_aplica",
            auxilioTransporte: "no_entregado",
          },
        ],
      },
      adminUser,
    );

    assert.equal(result.createdCount, 1);
    assert.equal(repository.createdCommands[0]?.tenantId, tenantId);
    assert.equal(repository.createdCommands[0]?.registros[0]?.adultoMayorId, adultoMayorId);
  });

  it("rejects batch creation when a record already exists for the same date", async () => {
    const repository = createRepository({
      existingByAdultosAndDate: [alimentacionRecord],
    });
    const service = new AlimentacionService(repository);

    await assert.rejects(
      () =>
        service.createBatch(
          {
            tenantId: null,
            deliveryDate: "2026-04-24",
            organizer: "nutricionista",
            registros: [
              {
                adultoMayorId,
                refrigerio1: "entregado",
                almuerzo: "entregado",
                refrigerio2: "entregado",
                auxilioTransporte: "entregado",
              },
            ],
          },
          adminUser,
        ),
      { constructor: ConflictException },
    );
  });

  it("returns the existing record id when preloading an adult for the selected date", async () => {
    const repository = createRepository({
      existingByAdultoAndDate: alimentacionRecord,
    });
    const service = new AlimentacionService(repository);

    const result = await service.lookupAdultoMayorByDate(
      adultoMayorId,
      { deliveryDate: "2026-04-24" },
      adminUser,
    );

    assert.equal(result.adultoMayor.id, adultoMayorId);
    assert.equal(result.existingRecordId, existingRecordId);
  });

  it("allows director users to update feeding records in their tenant", async () => {
    const repository = createRepository({
      existingByAdultoAndDate: null,
    });
    const service = new AlimentacionService(repository);

    const result = await service.updateRegistro(
      existingRecordId,
      {
        deliveryDate: "2026-04-25",
        organizer: "director",
        refrigerio1: "entregado",
        almuerzo: "entregado",
        refrigerio2: "entregado",
        auxilioTransporte: "entregado",
      },
      directorUser,
    );

    assert.equal(result.id, existingRecordId);
    assert.equal(result.organizer, "director");
    assert.equal(result.deliveryDate, "2026-04-25");
  });

  it("rejects updates that collide with another record on the same date", async () => {
    const repository = createRepository({
      existingByAdultoAndDate: {
        ...alimentacionRecord,
        id: "9d35fb33-8139-4c2f-8d42-2ecea20aac02",
      },
    });
    const service = new AlimentacionService(repository);

    await assert.rejects(
      () =>
        service.updateRegistro(
          existingRecordId,
          {
            deliveryDate: "2026-04-25",
            organizer: "director",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "entregado",
            auxilioTransporte: "entregado",
          },
          adminUser,
        ),
      { constructor: ConflictException },
    );
  });

  it("forbids unsupported roles from accessing feeding records", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    await assert.rejects(
      () => service.listRegistros({ search: null, deliveryDate: null, tenantId: null }, medicoUser),
      { constructor: ForbiddenException },
    );
  });

  it("forbids read-only and unsupported roles from creating or editing feeding records", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    await assert.rejects(
      () =>
        service.createBatch(
          {
            tenantId: null,
            deliveryDate: "2026-04-24",
            organizer: "director",
            registros: [
              {
                adultoMayorId,
                refrigerio1: "entregado",
                almuerzo: "entregado",
                refrigerio2: "entregado",
                auxilioTransporte: "entregado",
              },
            ],
          },
          medicoUser,
        ),
      { constructor: ForbiddenException },
    );

    await assert.rejects(
      () =>
        service.createBatch(
          {
            tenantId: null,
            deliveryDate: "2026-04-24",
            organizer: "director",
            registros: [
              {
                adultoMayorId,
                refrigerio1: "entregado",
                almuerzo: "entregado",
                refrigerio2: "entregado",
                auxilioTransporte: "entregado",
              },
            ],
          },
          auditorUser,
        ),
      { constructor: ForbiddenException },
    );

    await assert.rejects(
      () =>
        service.updateRegistro(
          existingRecordId,
          {
            deliveryDate: "2026-04-25",
            organizer: "director",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "entregado",
            auxilioTransporte: "entregado",
          },
          medicoUser,
      ),
      { constructor: ForbiddenException },
    );

    await assert.rejects(
      () =>
        service.updateRegistro(
          existingRecordId,
          {
            deliveryDate: "2026-04-25",
            organizer: "director",
            refrigerio1: "entregado",
            almuerzo: "entregado",
            refrigerio2: "entregado",
            auxilioTransporte: "entregado",
          },
          auditorUser,
        ),
      { constructor: ForbiddenException },
    );
  });

  it("forbids users without tenant from managing feeding records", async () => {
    const repository = createRepository();
    const service = new AlimentacionService(repository);

    await assert.rejects(
      () =>
        service.listRegistros(
          { search: null, deliveryDate: "2026-04-24", tenantId: null },
          tenantlessDirectorUser,
        ),
      { constructor: ForbiddenException },
    );
  });
});

function createRepository(
  overrides: {
    existingByAdultosAndDate?: AlimentacionRecord[];
    existingByAdultoAndDate?: AlimentacionRecord | null;
    records?: AlimentacionRecord[];
  } = {},
): AlimentacionRepository & {
  listQueries: FindAlimentacionRecordsQuery[];
  adultoOptionsQueries: SearchAlimentacionAdultosMayoresOptionsQuery[];
  createdCommands: Array<{
    tenantId: string;
    actorUserId: string;
    deliveryDate: string;
    organizer: AlimentacionRecord["organizer"];
    registros: Array<{
      adultoMayorId: string;
      refrigerio1: AlimentacionRecord["refrigerio1"];
      almuerzo: AlimentacionRecord["almuerzo"];
      refrigerio2: AlimentacionRecord["refrigerio2"];
      auxilioTransporte: AlimentacionRecord["auxilioTransporte"];
    }>;
  }>;
} {
  const records = overrides.records ?? [alimentacionRecord];
  const listQueries: FindAlimentacionRecordsQuery[] = [];
  const adultoOptionsQueries: SearchAlimentacionAdultosMayoresOptionsQuery[] = [];
  const createdCommands: Array<{
    tenantId: string;
    actorUserId: string;
    deliveryDate: string;
    organizer: AlimentacionRecord["organizer"];
    registros: Array<{
      adultoMayorId: string;
      refrigerio1: AlimentacionRecord["refrigerio1"];
      almuerzo: AlimentacionRecord["almuerzo"];
      refrigerio2: AlimentacionRecord["refrigerio2"];
      auxilioTransporte: AlimentacionRecord["auxilioTransporte"];
    }>;
  }> = [];

  return {
    listQueries,
    adultoOptionsQueries,
    createdCommands,
    async findMany(query) {
      listQueries.push(query);

      return records.filter((record) => {
        const matchesTenant = query.tenantId === null || record.tenantId === query.tenantId;
        const matchesDate =
          query.deliveryDate === null || record.deliveryDate === query.deliveryDate;
        const matchesSearch =
          query.search === null ||
          [record.documentNumber, record.fullName].some((value) =>
            value.toLowerCase().includes(query.search!.toLowerCase()),
          );

        return matchesTenant && matchesDate && matchesSearch;
      });
    },
    async findById({ id }) {
      return records.find((record) => record.id === id) ?? null;
    },
    async findTenantOptions() {
      return [{ id: tenantId, name: "Centro de Vida Demo" }];
    },
    async searchAdultosMayoresOptions(query) {
      adultoOptionsQueries.push(query);

      return query.search === null ||
        [adultoMayorRecord.documentNumber, adultoMayorRecord.fullName].some((value) =>
          value.toLowerCase().includes(query.search!.toLowerCase()),
        )
        ? [adultoMayorRecord]
        : [];
    },
    async findAdultosMayoresByIds(requestTenantId, adultoMayorIds) {
      return adultoMayorIds.includes(adultoMayorId) && requestTenantId === tenantId
        ? [adultoMayorRecord]
        : [];
    },
    async findAdultoMayorById({ adultoMayorId: requestedId }) {
      return requestedId === adultoMayorId ? adultoMayorRecord : null;
    },
    async findExistingByAdultosAndDate() {
      return overrides.existingByAdultosAndDate ?? [];
    },
    async findByAdultoMayorAndDate({ excludeId }) {
      if (overrides.existingByAdultoAndDate === undefined) {
        return excludeId === undefined ? alimentacionRecord : null;
      }

      if (
        overrides.existingByAdultoAndDate !== null &&
        overrides.existingByAdultoAndDate.id === excludeId
      ) {
        return null;
      }

      return overrides.existingByAdultoAndDate;
    },
    async createMany(command) {
      createdCommands.push(command);
      return command.registros.length;
    },
    async update(command) {
      return {
        ...alimentacionRecord,
        id: command.id,
        deliveryDate: command.deliveryDate,
        organizer: command.organizer,
        refrigerio1: command.refrigerio1,
        almuerzo: command.almuerzo,
        refrigerio2: command.refrigerio2,
        auxilioTransporte: command.auxilioTransporte,
        updatedAt: new Date("2026-04-25T12:00:00.000Z"),
      };
    },
  };
}
