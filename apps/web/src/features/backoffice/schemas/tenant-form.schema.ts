import {
  type BackofficeTenantDetail,
  updateBackofficeTenantRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

export type BackofficeTenantFormValues = z.input<typeof updateBackofficeTenantRequestSchema> & {
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
      city: "",
      department: "",
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
      city: detail.tenant.city ?? "",
      department: detail.tenant.department ?? "",
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
