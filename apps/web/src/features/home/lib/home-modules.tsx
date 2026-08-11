import {
  alimentacionAccessRoleValues,
  type AuthUser,
  type HomeDashboardShortcutModuleId,
} from "@cuidarte/contracts";
import {
  BriefcaseBusiness,
  CalendarPlus,
  Home,
  Upload,
  type LucideIcon,
  UserRoundCog,
  UsersRound,
  Utensils,
} from "lucide-react";

import { HOME_PATH } from "@/app/routes/paths";
import { ADULTOS_MAYORES_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { ADULTOS_MAYORES_IMPORT_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { REGISTRO_ALIMENTACION_PATH } from "@/features/alimentacion/lib/alimentacion-paths";
import { CREACION_ACTIVIDADES_PATH } from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { BACKOFFICE_PATH } from "@/features/backoffice/lib/backoffice-paths";
import { EMPLEADOS_PATH } from "@/features/empleados/lib/empleados-paths";

export type HomeModuleId = "inicio" | HomeDashboardShortcutModuleId;

export type HomeModule = {
  id: HomeModuleId;
  label: string;
  icon: LucideIcon;
  path: string;
  roles?: readonly AuthUser["role"][];
  summaryLabel?: string;
};

export type ShortcutHomeModule = HomeModule & {
  id: HomeDashboardShortcutModuleId;
  summaryLabel: string;
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
  },
  {
    id: "importacion-adultos-mayores",
    label: "Importar adultos mayores",
    icon: Upload,
    path: ADULTOS_MAYORES_IMPORT_PATH,
    roles: ["super_admin", "admin"],
    summaryLabel: "Importaciones completadas",
  },
  {
    id: "sesiones-grupales",
    label: "Sesiones grupales",
    icon: CalendarPlus,
    path: CREACION_ACTIVIDADES_PATH,
    summaryLabel: "Sesiones registradas",
  },
  {
    id: "registro-alimentacion",
    label: "Registro de alimentación",
    icon: Utensils,
    path: REGISTRO_ALIMENTACION_PATH,
    roles: alimentacionAccessRoleValues,
    summaryLabel: "Registros cargados",
  },
  {
    id: "gestion-empleados",
    label: "Gestión de empleados",
    icon: UserRoundCog,
    path: EMPLEADOS_PATH,
    roles: ["super_admin", "admin", "auditor"],
    summaryLabel: "Usuarios activos",
  },
  {
    id: "backoffice",
    label: "BackOffice",
    icon: BriefcaseBusiness,
    path: BACKOFFICE_PATH,
    roles: ["super_admin"],
    summaryLabel: "Centros activos",
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
  return module.id !== "inicio";
}
