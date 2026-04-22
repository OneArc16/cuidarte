import { type AuthUser } from "@cuidarte/contracts";
import {
  BriefcaseBusiness,
  CalendarPlus,
  Home,
  MessageSquareText,
  UserRoundCog,
  UsersRound,
  Utensils,
} from "lucide-react";
import { type ReactNode } from "react";

import { BACKOFFICE_PATH } from "@/features/backoffice/lib/backoffice-paths";
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
  },
  {
    id: "sesiones-grupales",
    label: "Sesiones grupales",
    icon: <MessageSquareText />,
  },
  {
    id: "creacion-actividades",
    label: "Creación de actividades",
    icon: <CalendarPlus />,
  },
  {
    id: "registro-alimentacion",
    label: "Registro de alimentación",
    icon: <Utensils />,
  },
  {
    id: "gestion-empleados",
    label: "Gestión de empleados",
    icon: <UserRoundCog />,
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
  "creacion-actividades",
] as const;

export function canViewModule(module: HomeModule, role: AuthUser["role"]): boolean {
  return module.roles === undefined || module.roles.includes(role);
}

export function isMobilePrimaryModule(module: HomeModule): boolean {
  return MOBILE_PRIMARY_MODULE_IDS.includes(
    module.id as (typeof MOBILE_PRIMARY_MODULE_IDS)[number],
  );
}
