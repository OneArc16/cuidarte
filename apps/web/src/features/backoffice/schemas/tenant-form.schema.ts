import {
  type BackofficeTenantDetail,
  backofficeTenantCommandSchema,
  createBackofficeTenantRequestSchema,
  updateBackofficeTenantRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

const backofficeTenantLocationFormSchema = backofficeTenantCommandSchema.extend({
  departmentId: z.uuid({ message: "Selecciona un departamento de la lista." }),
  municipalityId: z.uuid({ message: "Selecciona un municipio de la lista." }),
});

export const createBackofficeTenantFormSchema = createBackofficeTenantRequestSchema.extend({
  tenant: backofficeTenantLocationFormSchema,
});

export const updateBackofficeTenantFormSchema = updateBackofficeTenantRequestSchema.extend({
  tenant: backofficeTenantLocationFormSchema,
});

export type BackofficeTenantFormValues = z.input<typeof updateBackofficeTenantFormSchema> & {
  owner: z.input<typeof updateBackofficeTenantRequestSchema>["owner"] & {
    password: string;
  };
};

export function createDefaultFormValues(): BackofficeTenantFormValues {
  return {
    tenant: {
      documentType: "nit",
      documentNumber: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      departmentId: "",
      municipalityId: "",
      isActive: true,
    },
    owner: {
      fullName: "",
      email: "",
      password: "",
      isActive: true,
    },
  };
}

export function toFormValues(detail: BackofficeTenantDetail): BackofficeTenantFormValues {
  return {
    tenant: {
      documentType: detail.tenant.documentType,
      documentNumber: detail.tenant.documentNumber ?? "",
      name: detail.tenant.name,
      email: detail.tenant.email ?? "",
      phone: detail.tenant.phone ?? "",
      address: detail.tenant.address ?? "",
      departmentId: detail.tenant.departmentId ?? "",
      municipalityId: detail.tenant.municipalityId ?? "",
      isActive: detail.tenant.isActive,
    },
    owner: {
      fullName: detail.owner.fullName,
      email: detail.owner.email,
      password: "",
      isActive: detail.owner.isActive,
    },
  };
}
