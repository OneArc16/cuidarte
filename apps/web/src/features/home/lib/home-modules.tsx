import {
  alimentacionAccessRoleValues,
  atencionEnfermeriaModuleRoleValues,
  hasUserPermission,
  type AuthUser,
  type HomeDashboardShortcutModuleId,
  type UserPermission,
} from "@cuidarte/contracts";
import {
  BriefcaseBusiness,
  CalendarPlus,
  BarChart3,
  HeartPulse,
  Home,
  Settings,
  Upload,
  type LucideIcon,
  UserRoundCog,
  UsersRound,
  Utensils,
} from "lucide-react";

import { HOME_PATH } from "@/app/routes/paths";
import { ATENCIONES_ENFERMERIA_PATH } from "@/features/atenciones-enfermeria/lib/atenciones-enfermeria-paths";
import { ADULTOS_MAYORES_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { ADULTOS_MAYORES_IMPORT_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { REGISTRO_ALIMENTACION_PATH } from "@/features/alimentacion/lib/alimentacion-paths";
import { CREACION_ACTIVIDADES_PATH } from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { AJUSTES_PATH } from "@/features/ajustes/lib/ajustes-paths";
import { BACKOFFICE_PATH } from "@/features/backoffice/lib/backoffice-paths";
import { EMPLEADOS_PATH } from "@/features/empleados/lib/empleados-paths";
import { REPORTS_PATH } from "@/features/reports/lib/reports-paths";

export type HomeModuleId =
  | "inicio"
  | HomeDashboardShortcutModuleId
  | "atenciones-enfermeria"
  | "reportes"
  | "ajustes";

export type HomeModule = {
  id: HomeModuleId;
  label: string;
  icon: LucideIcon;
  path: string;
  roles?: readonly AuthUser["role"][];
  permission?: UserPermission;
  showInNavigation?: boolean;
  summaryLabel?: string;
  directAccessDescription?: string;
};

export type ShortcutHomeModule = HomeModule & {
  id: HomeDashboardShortcutModuleId;
  summaryLabel: string;
  directAccessDescription: string;
};

export const HOME_MODULES = [
  {
    id: "inicio",
    label: "Inicio",
    icon: Home,
    path: HOME_PATH,
  },
  {
    id: "adultos-mayores",
    label: "Adultos mayores",
    icon: UsersRound,
    path: ADULTOS_MAYORES_PATH,
    summaryLabel: "Adultos registrados",
    directAccessDescription: "Gestion y seguimiento",
    permission: "adultos_mayores.view",
  },
  {
    id: "importacion-adultos-mayores",
    label: "Importar adultos mayores",
    icon: Upload,
    path: ADULTOS_MAYORES_IMPORT_PATH,
    roles: ["super_admin", "admin", "director"],
    permission: "adultos_mayores.import",
    showInNavigation: false,
    summaryLabel: "Importaciones completadas",
    directAccessDescription: "Carga masiva",
  },
  {
    id: "sesiones-grupales",
    label: "Sesiones grupales",
    icon: CalendarPlus,
    path: CREACION_ACTIVIDADES_PATH,
    summaryLabel: "Sesiones registradas",
    directAccessDescription: "Planeacion y actas",
    permission: "actividades_grupales.view",
  },
  {
    id: "atenciones-enfermeria",
    label: "Enfermería",
    icon: HeartPulse,
    path: ATENCIONES_ENFERMERIA_PATH,
    roles: atencionEnfermeriaModuleRoleValues,
    summaryLabel: "Atenciones de enfermería",
    directAccessDescription: "Signos vitales, glucometría y notas",
    permission: "atenciones_enfermeria.view",
  },
  {
    id: "registro-alimentacion",
    label: "Registro de alimentación",
    icon: Utensils,
    path: REGISTRO_ALIMENTACION_PATH,
    roles: alimentacionAccessRoleValues,
    summaryLabel: "Registros cargados",
    directAccessDescription: "Registro diario",
    permission: "alimentacion.view",
  },
  {
    id: "gestion-empleados",
    label: "Gestión de empleados",
    icon: UserRoundCog,
    path: EMPLEADOS_PATH,
    roles: ["super_admin", "admin", "auditor", "director"],
    summaryLabel: "Usuarios activos",
    directAccessDescription: "Equipo y perfiles",
    permission: "empleados.view",
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: BarChart3,
    path: REPORTS_PATH,
    roles: ["super_admin", "admin", "auditor", "director"],
    permission: "reportes.view",
    summaryLabel: "Estadísticas y exportaciones",
    directAccessDescription: "Indicadores por periodo",
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: Settings,
    path: AJUSTES_PATH,
    roles: ["super_admin", "admin"],
    permission: "ajustes.actividades.manage",
  },
  {
    id: "backoffice",
    label: "BackOffice",
    icon: BriefcaseBusiness,
    path: BACKOFFICE_PATH,
    roles: ["super_admin"],
    summaryLabel: "Centros activos",
    directAccessDescription: "Configuracion central",
  },
] satisfies readonly HomeModule[];

const MOBILE_PRIMARY_MODULE_IDS = ["inicio", "adultos-mayores", "sesiones-grupales"] as const;

export function canViewModule(module: HomeModule, user: AuthUser): boolean {
  if (user.permissions !== undefined && module.permission !== undefined) {
    return hasUserPermission(user, module.permission);
  }

  return module.roles === undefined || module.roles.includes(user.role);
}

export function isNavigationModule(module: HomeModule): boolean {
  return module.showInNavigation !== false;
}

export function isMobilePrimaryModule(module: HomeModule): boolean {
  return MOBILE_PRIMARY_MODULE_IDS.includes(
    module.id as (typeof MOBILE_PRIMARY_MODULE_IDS)[number],
  );
}

export function isShortcutModule(module: HomeModule): module is ShortcutHomeModule {
  return module.id !== "inicio" && module.id !== "atenciones-enfermeria";
}
