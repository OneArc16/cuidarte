import {
  type AlimentacionOrganizer,
  type AlimentacionStatus,
} from "@cuidarte/contracts";

export type AlimentacionScope =
  | {
      type: "all";
    }
  | {
      type: "tenant";
      tenantId: string;
    };

export type FindAlimentacionRecordsQuery = {
  search: string | null;
  deliveryDate: string | null;
  tenantId: string | null;
  scope: AlimentacionScope;
};

export type FindAlimentacionRecordByIdQuery = {
  id: string;
  scope: AlimentacionScope;
};

export type SearchAlimentacionAdultosMayoresOptionsQuery = {
  tenantId: string;
  deliveryDate: string;
  search: string | null;
};

export type FindAlimentacionAdultoMayorByIdQuery = {
  adultoMayorId: string;
  scope: AlimentacionScope;
};

export type FindAlimentacionExistingRecordsByAdultosAndDateQuery = {
  tenantId: string;
  deliveryDate: string;
  adultoMayorIds: string[];
};

export type FindAlimentacionRecordByAdultoMayorAndDateQuery = {
  tenantId: string;
  adultoMayorId: string;
  deliveryDate: string;
  excludeId?: string;
};

export type AlimentacionTenantOptionRecord = {
  id: string;
  name: string;
};

export type AlimentacionAdultoOptionRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  documentNumber: string;
  fullName: string;
};

export type AlimentacionRecord = {
  id: string;
  tenantId: string;
  tenantName: string;
  adultoMayorId: string;
  documentNumber: string;
  fullName: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type CreateAlimentacionBatchRecordCommand = {
  tenantId: string;
  actorUserId: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  registros: Array<{
    adultoMayorId: string;
    refrigerio1: AlimentacionStatus;
    almuerzo: AlimentacionStatus;
    refrigerio2: AlimentacionStatus;
    auxilioTransporte: AlimentacionStatus;
  }>;
};

export type UpdateAlimentacionRecordCommand = {
  id: string;
  actorUserId: string;
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
};
