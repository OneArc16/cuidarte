import {
  type CreateEmpleadoRequest,
  type EmpleadoDetail,
  type UpdateEmpleadoRequest,
  userRoleSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

const requiredTextSchema = (maxLength: number) => z.string().trim().min(1).max(maxLength);
const optionalTextSchema = (maxLength: number) => z.string().trim().max(maxLength);

export const empleadoFormSchema = z.object({
  tenantId: z.string(),
  firstName: requiredTextSchema(80),
  middleName: optionalTextSchema(80),
  firstSurname: requiredTextSchema(80),
  secondSurname: optionalTextSchema(80),
  email: z.email().max(320),
  documentNumber: requiredTextSchema(80),
  phone: optionalTextSchema(40),
  role: userRoleSchema,
  isActive: z.boolean(),
  password: z.string().max(128),
});

export type EmpleadoFormValues = z.infer<typeof empleadoFormSchema>;

export function createDefaultEmpleadoFormValues(): EmpleadoFormValues {
  return {
    tenantId: "",
    firstName: "",
    middleName: "",
    firstSurname: "",
    secondSurname: "",
    email: "",
    documentNumber: "",
    phone: "",
    role: "director",
    isActive: true,
    password: "",
  };
}

export function toEmpleadoFormValues(detail: EmpleadoDetail): EmpleadoFormValues {
  return {
    tenantId: detail.tenantId ?? "",
    firstName: detail.firstName,
    middleName: detail.middleName ?? "",
    firstSurname: detail.firstSurname,
    secondSurname: detail.secondSurname ?? "",
    email: detail.email,
    documentNumber: detail.documentNumber ?? "",
    phone: detail.phone ?? "",
    role: detail.role,
    isActive: detail.isActive,
    password: "",
  };
}

export function toCreateEmpleadoRequest(values: EmpleadoFormValues): CreateEmpleadoRequest {
  return {
    tenantId: values.tenantId.trim() === "" ? null : values.tenantId,
    firstName: values.firstName,
    middleName: toNullableText(values.middleName),
    firstSurname: values.firstSurname,
    secondSurname: toNullableText(values.secondSurname),
    email: values.email,
    documentNumber: values.documentNumber,
    phone: toNullableText(values.phone),
    role: values.role,
    isActive: values.isActive,
    password: values.password,
  };
}

export function toUpdateEmpleadoRequest(values: EmpleadoFormValues): UpdateEmpleadoRequest {
  const password = values.password.trim();

  return {
    firstName: values.firstName,
    middleName: toNullableText(values.middleName),
    firstSurname: values.firstSurname,
    secondSurname: toNullableText(values.secondSurname),
    email: values.email,
    documentNumber: values.documentNumber,
    phone: toNullableText(values.phone),
    role: values.role,
    isActive: values.isActive,
    ...(password === "" ? {} : { password }),
  };
}

function toNullableText(value: string): string | null {
  const trimmedValue = value.trim();

  return trimmedValue === "" ? null : trimmedValue;
}
