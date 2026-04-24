import { type AuthUser } from "@cuidarte/contracts";
import {
  BriefcaseBusiness,
  CalendarPlus,
  Home,
  UserRoundCog,
  UsersRound,
  Utensils,
} from "lucide-react";
import { type ReactNode } from "react";

import { ADULTOS_MAYORES_PATH } from "@/features/adultos-mayores/lib/adultos-mayores-paths";
import { REGISTRO_ALIMENTACION_PATH } from "@/features/alimentacion/lib/alimentacion-paths";
import { CREACION_ACTIVIDADES_PATH } from "@/features/actividades-grupales/lib/actividades-grupales-paths";
import { BACKOFFICE_PATH } from "@/features/backoffice/lib/backoffice-paths";
import { EMPLEADOS_PATH } from "@/features/empleados/lib/empleados-paths";
import { HOME_PATH } from "@/app/routes/paths";

export type HomeModule = {
  id: string;
  label: string;
  icon: ReactNode;
  path?: string;
  roles?: readonly AuthUser["role"][];
};

export const HOME_MODULES = [
  {
    id: "inicio",
    label: "Inicio",
    icon: <Home />,
    path: HOME_PATH,
  },
  {
    id: "adultos-mayores",
    label: "Adultos mayores",
    icon: <UsersRound />,
    path: ADULTOS_MAYORES_PATH,
  },
  {
    id: "sesiones-grupales",
    label: "Sesiones grupales",
    icon: <CalendarPlus />,
    path: CREACION_ACTIVIDADES_PATH,
  },
  {
    id: "registro-alimentacion",
    label: "Registro de alimentación",
    icon: <Utensils />,
    path: REGISTRO_ALIMENTACION_PATH,
  },
  {
    id: "gestion-empleados",
    label: "Gestión de empleados",
    icon: <UserRoundCog />,
    path: EMPLEADOS_PATH,
    roles: ["super_admin", "admin"],
  },
  {
    id: "backoffice",
    label: "BackOffice",
    icon: <BriefcaseBusiness />,
    path: BACKOFFICE_PATH,
    roles: ["super_admin"],
  },
] satisfies readonly HomeModule[];

const MOBILE_PRIMARY_MODULE_IDS = [
  "inicio",
  "adultos-mayores",
  "sesiones-grupales",
] as const;

export function canViewModule(module: HomeModule, role: AuthUser["role"]): boolean {
  return module.roles === undefined || module.roles.includes(role);
}

export function isMobilePrimaryModule(module: HomeModule): boolean {
  return MOBILE_PRIMARY_MODULE_IDS.includes(
    module.id as (typeof MOBILE_PRIMARY_MODULE_IDS)[number],
  );
}
