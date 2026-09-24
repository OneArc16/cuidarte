import { z } from "zod";

export const userRoleValues = [
  "super_admin",
  "admin",
  "auditor",
  "director",
  "enfermeria",
  "fisioterapeuta",
  "medico",
  "nutricionista",
  "psicologo",
  "recreacionista",
  "trabajadora_social",
] as const;

export const userRoleSchema = z.enum(userRoleValues);

export const userPermissionValues = [
  "dashboard.view",
  "empleados.view",
  "empleados.create",
  "empleados.edit",
  "actividades_grupales.view",
  "actividades_grupales.create",
  "actividades_grupales.edit",
  "actividades_grupales.delete",
  "actividades_grupales.correct",
  "adultos_mayores.view",
  "adultos_mayores.create",
  "adultos_mayores.edit",
  "adultos_mayores.delete",
  "adultos_mayores.import",
  "alimentacion.view",
  "alimentacion.create",
  "alimentacion.edit",
  "alimentacion.delete",
  "alimentacion.import",
  "alimentacion.export",
  "atenciones_individuales.view",
  "atenciones_individuales.create",
  "atenciones_individuales.edit",
  "atenciones_enfermeria.view",
  "atenciones_enfermeria.create",
  "atenciones_enfermeria.edit",
  "atenciones_enfermeria.delete",
  "reportes.view",
  "reportes.export",
  "ajustes.actividades.manage",
] as const;

export const userPermissionSchema = z.enum(userPermissionValues);

export const userPermissionCatalog = [
  {
    key: "dashboard.view",
    group: "Inicio",
    label: "Ver inicio",
    description: "Consultar el tablero principal.",
  },
  {
    key: "empleados.view",
    group: "Empleados",
    label: "Ver empleados",
    description: "Consultar el listado y detalle de empleados.",
  },
  {
    key: "empleados.create",
    group: "Empleados",
    label: "Crear empleados",
    description: "Registrar nuevos empleados.",
  },
  {
    key: "empleados.edit",
    group: "Empleados",
    label: "Editar empleados",
    description: "Actualizar datos y estado de empleados.",
  },
  {
    key: "actividades_grupales.view",
    group: "Actividades grupales",
    label: "Ver actividades",
    description: "Consultar actas y sesiones grupales.",
  },
  {
    key: "actividades_grupales.create",
    group: "Actividades grupales",
    label: "Crear actividades",
    description: "Crear actas y diligenciamientos grupales.",
  },
  {
    key: "actividades_grupales.edit",
    group: "Actividades grupales",
    label: "Editar actividades",
    description: "Editar actas cuando el empleado está vinculado o tiene alcance administrativo.",
  },
  {
    key: "actividades_grupales.delete",
    group: "Actividades grupales",
    label: "Enviar actividades a papelera",
    description: "Enviar actas a la papelera.",
  },
  {
    key: "actividades_grupales.correct",
    group: "Actividades grupales",
    label: "Corregir consecutivos",
    description: "Corregir números de acta y consecutivos.",
  },
  {
    key: "adultos_mayores.view",
    group: "Adultos mayores",
    label: "Ver adultos mayores",
    description: "Consultar adultos mayores.",
  },
  {
    key: "adultos_mayores.create",
    group: "Adultos mayores",
    label: "Crear adultos mayores",
    description: "Registrar adultos mayores.",
  },
  {
    key: "adultos_mayores.edit",
    group: "Adultos mayores",
    label: "Editar adultos mayores",
    description: "Actualizar información de adultos mayores.",
  },
  {
    key: "adultos_mayores.delete",
    group: "Adultos mayores",
    label: "Gestionar papelera",
    description: "Enviar y restaurar registros de adultos mayores.",
  },
  {
    key: "adultos_mayores.import",
    group: "Adultos mayores",
    label: "Importar adultos mayores",
    description: "Validar y confirmar importaciones.",
  },
  {
    key: "alimentacion.view",
    group: "Alimentación",
    label: "Ver alimentación",
    description: "Consultar registros de alimentación.",
  },
  {
    key: "alimentacion.create",
    group: "Alimentación",
    label: "Crear alimentación",
    description: "Registrar entregas de alimentación.",
  },
  {
    key: "alimentacion.edit",
    group: "Alimentación",
    label: "Editar alimentación",
    description: "Actualizar registros de alimentación.",
  },
  {
    key: "alimentacion.delete",
    group: "Alimentación",
    label: "Eliminar alimentación",
    description: "Eliminar registros de alimentación.",
  },
  {
    key: "alimentacion.import",
    group: "Alimentación",
    label: "Importar formatos",
    description: "Cargar formatos de alimentación.",
  },
  {
    key: "alimentacion.export",
    group: "Alimentación",
    label: "Exportar alimentación",
    description: "Descargar formatos y reportes de alimentación.",
  },
  {
    key: "atenciones_individuales.view",
    group: "Atenciones individuales",
    label: "Ver historia clínica",
    description: "Consultar la historia clínica según alcance.",
  },
  {
    key: "atenciones_individuales.create",
    group: "Atenciones individuales",
    label: "Crear atenciones",
    description: "Registrar atenciones individuales.",
  },
  {
    key: "atenciones_individuales.edit",
    group: "Atenciones individuales",
    label: "Editar atenciones",
    description: "Editar atenciones propias según las reglas clínicas.",
  },
  {
    key: "atenciones_enfermeria.view",
    group: "Enfermería",
    label: "Ver enfermería",
    description: "Consultar atenciones de enfermería.",
  },
  {
    key: "atenciones_enfermeria.create",
    group: "Enfermería",
    label: "Crear enfermería",
    description: "Registrar atenciones de enfermería.",
  },
  {
    key: "atenciones_enfermeria.edit",
    group: "Enfermería",
    label: "Editar enfermería",
    description: "Editar atenciones propias de enfermería.",
  },
  {
    key: "atenciones_enfermeria.delete",
    group: "Enfermería",
    label: "Gestionar papelera",
    description: "Enviar y restaurar atenciones de enfermería.",
  },
  {
    key: "reportes.view",
    group: "Reportes",
    label: "Ver reportes",
    description: "Consultar reportes.",
  },
  {
    key: "reportes.export",
    group: "Reportes",
    label: "Exportar reportes",
    description: "Descargar reportes.",
  },
  {
    key: "ajustes.actividades.manage",
    group: "Ajustes",
    label: "Administrar actividades",
    description: "Crear, editar y activar tipos de actividad.",
  },
] as const satisfies readonly {
  key: UserPermission;
  group: string;
  label: string;
  description: string;
}[];

export const empleadoPermissionsResponseSchema = z.object({
  employeeId: z.uuid(),
  permissions: z.array(userPermissionSchema),
  catalog: z.array(
    z.object({
      key: userPermissionSchema,
      group: z.string().min(1),
      label: z.string().min(1),
      description: z.string().min(1),
    }),
  ),
});

export const updateEmpleadoPermissionsRequestSchema = z.object({
  permissions: z.array(userPermissionSchema).max(userPermissionValues.length),
});

export type UserPermission = (typeof userPermissionValues)[number];
export type EmpleadoPermissionsResponse = z.infer<typeof empleadoPermissionsResponseSchema>;
export type UpdateEmpleadoPermissionsRequest = z.infer<
  typeof updateEmpleadoPermissionsRequestSchema
>;

export function hasUserPermission(
  user: Pick<AuthUser, "permissions">,
  permission: UserPermission,
): boolean {
  return user.permissions === undefined || user.permissions.includes(permission);
}

export const authUserSchema = z.object({
  id: z.uuid(),
  tenantId: z.uuid().nullable(),
  tenantMunicipality: z.string().min(1).nullable().optional(),
  tenantDepartment: z.string().min(1).nullable().optional(),
  email: z.email(),
  fullName: z.string().min(1),
  role: userRoleSchema,
  passwordSetByAdmin: z.boolean(),
  permissions: z.array(userPermissionSchema).optional(),
});

export const loginRequestSchema = z.object({
  email: z.email("Ingresa un correo electrónico válido.").transform((value) => value.toLowerCase()),
  password: z.string().min(1, "La contraseña es obligatoria."),
});

export const authSessionSchema = z.object({
  user: authUserSchema,
});

export const meResponseSchema = z.object({
  user: authUserSchema.nullable(),
});

export const logoutResponseSchema = z.object({
  success: z.literal(true),
});

export type UserRole = z.infer<typeof userRoleSchema>;
export type AuthUser = z.infer<typeof authUserSchema>;
export type LoginRequest = z.input<typeof loginRequestSchema>;
export type AuthSession = z.infer<typeof authSessionSchema>;
export type MeResponse = z.infer<typeof meResponseSchema>;
export type LogoutResponse = z.infer<typeof logoutResponseSchema>;
