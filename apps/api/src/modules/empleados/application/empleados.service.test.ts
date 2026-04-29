import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { type AuthUser } from "@cuidarte/contracts";
import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";

import { EmpleadosService } from "./empleados.service";
import {
  type EmpleadoAuditCommand,
  type EmpleadoRecord,
  type FindEmpleadosQuery,
} from "../domain/empleado.types";
import { type EmpleadosRepository } from "../domain/empleados.repository";

const tenantId = "7c11e9f0-1bb0-4a59-a1f9-5392ba7e0054";
const otherTenantId = "3436e34e-05b3-4da7-9895-5c4ef847d23a";

const adminUser: AuthUser = {
  id: "9f75c51f-74ab-40b7-84ef-9e4a93d14af1",
  tenantId,
  email: "admin@centro-demo.test",
  fullName: "Admin Centro Demo",
  role: "admin",
  passwordSetByAdmin: true,
};

const superAdminUser: AuthUser = {
  ...adminUser,
  id: "4c5b84e6-d88e-4f8a-93de-af2916d62f40",
  tenantId: null,
  email: "superadmin@cuidarte.test",
  fullName: "SuperAdmin Cuidarte",
  role: "super_admin",
};

const auditorUser: AuthUser = {
  ...adminUser,
  id: "6f41f9cb-b7bc-4d4b-a9d9-020ea028f787",
  email: "auditor@centro-demo.test",
  fullName: "Auditor Centro Demo",
  role: "auditor",
};

const medicoUser: AuthUser = {
  ...adminUser,
  id: "eaebfa34-4ef2-4b10-b8a5-1db6d494a2a2",
  email: "medico@centro-demo.test",
  fullName: "Medico Centro Demo",
  role: "medico",
};

const records: EmpleadoRecord[] = [
  {
    id: "aeeb7b27-2c8d-48ce-b2f8-3397d34a6e72",
    tenantId,
    tenantName: "Centro de Vida Demo",
    email: "laura.perez@centro-demo.test",
    fullName: "Laura Natalia Perez Ruiz",
    firstName: "Laura",
    middleName: "Natalia",
    firstSurname: "Perez",
    secondSurname: "Ruiz",
    documentNumber: "1010101010",
    phone: "3105551212",
    role: "medico",
    isActive: true,
    isTenantOwner: false,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    updatedAt: new Date("2026-04-21T12:00:00.000Z"),
  },
  {
    id: "51f7edc5-8fc1-4f03-9641-1f5687f11631",
    tenantId: otherTenantId,
    tenantName: "Centro Norte",
    email: "director@centro-norte.test",
    fullName: "Director Centro Norte",
    firstName: "Director",
    middleName: null,
    firstSurname: "Centro",
    secondSurname: "Norte",
    documentNumber: "2020202020",
    phone: null,
    role: "director",
    isActive: true,
    isTenantOwner: false,
    createdAt: new Date("2026-04-21T12:00:00.000Z"),
    updatedAt: new Date("2026-04-21T12:00:00.000Z"),
  },
];

describe("EmpleadosService", () => {
  it("scopes admin users to their tenant", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    const result = await service.listEmpleados({ search: "laura" }, adminUser);

    assert.equal(result.length, 1);
    assert.equal(result[0]?.tenantId, tenantId);
    assert.deepEqual(repository.queries[0], {
      search: "laura",
      scope: { type: "tenant", tenantId },
    });
  });

  it("allows SuperAdmin users to list all tenants", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    const result = await service.listEmpleados({ search: null }, superAdminUser);

    assert.equal(result.length, 2);
    assert.deepEqual(repository.queries[0], {
      search: null,
      scope: { type: "all" },
    });
  });

  it("allows auditor users to list tenant employees", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    const result = await service.listEmpleados({ search: null }, auditorUser);

    assert.equal(result.length, 1);
    assert.deepEqual(repository.queries[0], {
      search: null,
      scope: { type: "tenant", tenantId },
    });
  });

  it("forbids professional roles from managing employees", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    await assert.rejects(() => service.listEmpleados({ search: null }, medicoUser), {
      constructor: ForbiddenException,
    });
  });

  it("forbids auditor users from creating and updating employees", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    await assert.rejects(() => service.createEmpleado(createCommand(), auditorUser), {
      constructor: ForbiddenException,
    });

    await assert.rejects(
      () =>
        service.updateEmpleado(
          records[0]?.id ?? "",
          {
            firstName: "Laura",
            middleName: "Natalia",
            firstSurname: "Perez",
            secondSurname: "Ruiz",
            email: "laura.perez@centro-demo.test",
            documentNumber: "1010101010",
            phone: "3125553030",
            role: "medico",
            isActive: true,
          },
          auditorUser,
        ),
      { constructor: ForbiddenException },
    );
  });

  it("creates tenant employees in the admin tenant", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    const result = await service.createEmpleado(createCommand(), adminUser);

    assert.equal(result.tenantId, tenantId);
    assert.equal(result.fullName, "Carlos Andres Mora Diaz");
    assert.equal(result.isActive, true);
    assert.equal(repository.created[0]?.tenantId, tenantId);
    assert.equal(repository.created[0]?.role, "admin");
  });

  it("prevents admins from assigning SuperAdmin", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    await assert.rejects(
      () => service.createEmpleado({ ...createCommand(), role: "super_admin" }, adminUser),
      { constructor: ForbiddenException },
    );
  });

  it("updates employees and records password reset audit when password is present", async () => {
    const repository = createRepository();
    const service = new EmpleadosService(repository);

    const result = await service.updateEmpleado(
      records[0]?.id ?? "",
      {
        firstName: "Laura",
        middleName: "Natalia",
        firstSurname: "Perez",
        secondSurname: "Ruiz",
        email: "laura.perez@centro-demo.test",
        documentNumber: "1010101010",
        phone: "3125553030",
        role: "medico",
        isActive: false,
        password: "Cuidarte123!",
      },
      adminUser,
    );

    assert.equal(result.phone, "3125553030");
    assert.equal(result.isActive, false);
    assert.equal(repository.auditEntries[0]?.length, 3);
    assert.equal(repository.auditEntries[0]?.[1]?.action, "empleados.deactivated");
    assert.equal(repository.auditEntries[0]?.[2]?.action, "empleados.password_reset");
  });

  it("raises conflict when a document already exists in the same tenant", async () => {
    const duplicateRecord = records[0];

    assert.ok(duplicateRecord);

    const repository = createRepository({
      documentConflict: duplicateRecord,
    });
    const service = new EmpleadosService(repository);

    await assert.rejects(() => service.createEmpleado(createCommand(), adminUser), {
      constructor: ConflictException,
    });
  });

  it("prevents a user from inactivating their own account", async () => {
    const baseRecord = records[0];

    assert.ok(baseRecord);

    const repository = createRepository({
      currentRecord: {
        ...baseRecord,
        id: adminUser.id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        firstName: "Admin",
        middleName: null,
        firstSurname: "Centro",
        secondSurname: "Demo",
        documentNumber: "900123123",
        role: "admin",
        isActive: true,
      },
    });
    const service = new EmpleadosService(repository);

    await assert.rejects(
      () =>
        service.updateEmpleado(
          adminUser.id,
          {
            firstName: "Admin",
            middleName: null,
            firstSurname: "Centro",
            secondSurname: "Demo",
            email: "admin@centro-demo.test",
            documentNumber: "900123123",
            phone: "3105550000",
            role: "admin",
            isActive: false,
          },
          adminUser,
        ),
      { constructor: BadRequestException, message: /inactivar tu propia cuenta/i },
    );
  });
});

function createCommand() {
  return {
    tenantId: null,
    firstName: "Carlos",
    middleName: "Andres",
    firstSurname: "Mora",
    secondSurname: "Diaz",
    email: "carlos.mora@centro-demo.test",
    documentNumber: "3030303030",
    phone: "3115552020",
    role: "admin" as const,
    isActive: true,
    password: "Cuidarte123!",
  };
}

function createRepository(overrides: {
  currentRecord?: EmpleadoRecord;
  documentConflict?: EmpleadoRecord;
} = {}) {
  const repository = {
    queries: [] as FindEmpleadosQuery[],
    created: [] as Array<Parameters<EmpleadosRepository["create"]>[0]>,
    updates: [] as Array<Parameters<EmpleadosRepository["update"]>[0]>,
    auditEntries: [] as EmpleadoAuditCommand[][],
    async findMany(query) {
      repository.queries.push(query);

      return records.filter((record) =>
        query.scope.type === "tenant" ? record.tenantId === query.scope.tenantId : true,
      );
    },
    async findById(query) {
      const availableRecords = overrides.currentRecord === undefined ? records : [overrides.currentRecord, ...records];

      return (
        availableRecords.find(
          (record) =>
            record.id === query.id &&
            (query.scope.type === "all" || record.tenantId === query.scope.tenantId),
        ) ?? null
      );
    },
    async findByEmail() {
      return null;
    },
    async findByDocument() {
      return overrides.documentConflict ?? null;
    },
    async findTenantOptions() {
      return [{ id: tenantId, name: "Centro de Vida Demo" }];
    },
    async create(command, audit) {
      const baseRecord = records[0];

      if (baseRecord === undefined) {
        throw new Error("Fixture de empleado no disponible.");
      }

      repository.created.push(command);
      repository.auditEntries.push([audit]);

      return {
        ...baseRecord,
        id: "d82f34b1-26d6-40b2-8980-fb63f5d6ac6b",
        tenantId: command.tenantId,
        tenantName: command.tenantId === null ? null : "Centro de Vida Demo",
        email: command.email,
        fullName: [
          command.firstName,
          command.middleName,
          command.firstSurname,
          command.secondSurname,
        ]
          .filter(Boolean)
          .join(" "),
        firstName: command.firstName,
        middleName: command.middleName,
        firstSurname: command.firstSurname,
        secondSurname: command.secondSurname,
        documentNumber: command.documentNumber,
        phone: command.phone,
        role: command.role,
        isActive: command.isActive,
      } satisfies EmpleadoRecord;
    },
    async update(command, auditEntries) {
      const baseRecord = records[0];

      if (baseRecord === undefined) {
        throw new Error("Fixture de empleado no disponible.");
      }

      repository.updates.push(command);
      repository.auditEntries.push(auditEntries);

      return {
        ...baseRecord,
        email: command.email,
        fullName: [
          command.firstName,
          command.middleName,
          command.firstSurname,
          command.secondSurname,
        ]
          .filter(Boolean)
          .join(" "),
        firstName: command.firstName,
        middleName: command.middleName,
        firstSurname: command.firstSurname,
        secondSurname: command.secondSurname,
        documentNumber: command.documentNumber,
        phone: command.phone,
        role: command.role,
        isActive: command.isActive,
      } satisfies EmpleadoRecord;
    },
  } satisfies EmpleadosRepository & {
    queries: FindEmpleadosQuery[];
    created: Array<Parameters<EmpleadosRepository["create"]>[0]>;
    updates: Array<Parameters<EmpleadosRepository["update"]>[0]>;
    auditEntries: EmpleadoAuditCommand[][];
  };

  return repository;
}
