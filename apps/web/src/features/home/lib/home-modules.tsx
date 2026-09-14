import {
  alimentacionAccessRoleValues,
  atencionEnfermeriaModuleRoleValues,
  type AuthUser,
  type HomeDashboardShortcutModuleId,
} from "@cuidarte/contracts";
import {
  BriefcaseBusiness,
  CalendarPlus,
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

export type HomeModuleId =
  | "inicio"
  | HomeDashboardShortcutModuleId
  | "atenciones-enfermeria"
  | "ajustes";

export type HomeModule = {
  id: HomeModuleId;
  label: string;
  icon: LucideIcon;
  path: string;
  roles?: readonly AuthUser["role"][];
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
  },
  {
    id: "importacion-adultos-mayores",
    label: "Importar adultos mayores",
    icon: Upload,
    path: ADULTOS_MAYORES_IMPORT_PATH,
    roles: ["super_admin", "admin", "director"],
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
  },
  {
    id: "atenciones-enfermeria",
    label: "Enfermería",
    icon: HeartPulse,
    path: ATENCIONES_ENFERMERIA_PATH,
    roles: atencionEnfermeriaModuleRoleValues,
    summaryLabel: "Atenciones de enfermería",
    directAccessDescription: "Signos vitales, glucometría y notas",
  },
  {
    id: "registro-alimentacion",
    label: "Registro de alimentación",
    icon: Utensils,
    path: REGISTRO_ALIMENTACION_PATH,
    roles: alimentacionAccessRoleValues,
    summaryLabel: "Registros cargados",
    directAccessDescription: "Registro diario",
  },
  {
    id: "gestion-empleados",
    label: "Gestión de empleados",
    icon: UserRoundCog,
    path: EMPLEADOS_PATH,
    roles: ["super_admin", "admin", "auditor", "director"],
    summaryLabel: "Usuarios activos",
    directAccessDescription: "Equipo y perfiles",
  },
  {
    id: "ajustes",
    label: "Ajustes",
    icon: Settings,
    path: AJUSTES_PATH,
    roles: ["super_admin", "admin"],
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

export function canViewModule(module: HomeModule, role: AuthUser["role"]): boolean {
  return module.roles === undefined || module.roles.includes(role);
}

export function isMobilePrimaryModule(module: HomeModule): boolean {
  return MOBILE_PRIMARY_MODULE_IDS.includes(
    module.id as (typeof MOBILE_PRIMARY_MODULE_IDS)[number],
  );
}

export function isShortcutModule(module: HomeModule): module is ShortcutHomeModule {
  return module.id !== "inicio" && module.id !== "atenciones-enfermeria";
}
