import {
  type AlimentacionOrganizer,
  type AlimentacionStatus,
} from "@cuidarte/contracts";

export type AlimentacionFormatoEntregaExportRecord = {
  deliveryDate: string;
  organizer: AlimentacionOrganizer;
  refrigerio1: AlimentacionStatus;
  almuerzo: AlimentacionStatus;
  refrigerio2: AlimentacionStatus;
  auxilioTransporte: AlimentacionStatus;
  updatedAt: Date;
};

export type AlimentacionFormatoEntregaExportData = {
  tenantId: string;
  tenantName: string;
  tenantCity: string | null;
  tenantDepartment: string | null;
  adultoMayorId: string;
  documentNumber: string;
  fullName: string;
  deliveryMonth: string;
  records: AlimentacionFormatoEntregaExportRecord[];
};
