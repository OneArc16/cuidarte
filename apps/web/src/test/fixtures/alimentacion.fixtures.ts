import { adultoMayorFixture } from "./adultos-mayores.fixtures";
import { backofficeTenantDetailFixture } from "./backoffice.fixtures";

export const alimentacionAdultoOptionFixture = {
  id: adultoMayorFixture.id,
  tenantId: adultoMayorFixture.tenantId,
  tenantName: adultoMayorFixture.tenantName,
  documentNumber: adultoMayorFixture.documentNumber,
  fullName: `${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
} as const;

export const alimentacionFixture = {
  id: "4f3e6b3b-e94a-4791-9b94-10fdbec70eb3",
  tenantId: backofficeTenantDetailFixture.tenant.id,
  tenantName: backofficeTenantDetailFixture.tenant.name,
  adultoMayorId: adultoMayorFixture.id,
  documentNumber: adultoMayorFixture.documentNumber,
  fullName: `${adultoMayorFixture.names} ${adultoMayorFixture.surnames}`,
  deliveryDate: "2026-04-24",
  organizer: "nutricionista",
  refrigerio1: "entregado",
  almuerzo: "entregado",
  refrigerio2: "no_aplica",
  auxilioTransporte: "no_entregado",
  createdAt: "2026-04-24T12:00:00.000Z",
  updatedAt: "2026-04-24T12:00:00.000Z",
  canDelete: true,
} as const;
