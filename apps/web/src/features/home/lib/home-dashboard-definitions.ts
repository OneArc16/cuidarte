import {
  type HomeDashboardIndicatorId,
  type HomeDashboardShortcutModuleId,
} from "@cuidarte/contracts";
import {
  Activity,
  Apple,
  CalendarDays,
  MapPinned,
  Palette,
  PartyPopper,
  ShieldPlus,
  type LucideIcon,
  UserRound,
  UsersRound,
  UtensilsCrossed,
} from "lucide-react";

export type HomeDashboardIndicatorDefinition = {
  id: HomeDashboardIndicatorId;
  label: string;
  icon: LucideIcon;
  tone: "emerald" | "sky" | "gold" | "coral" | "ink";
  targetModuleId: HomeDashboardShortcutModuleId;
};

export const HOME_DASHBOARD_INDICATORS = [
  {
    id: "adultos_registrados",
    label: "Adultos registrados",
    icon: UsersRound,
    tone: "emerald",
    targetModuleId: "adultos-mayores",
  },
  {
    id: "salud_preventiva",
    label: "Salud preventiva",
    icon: ShieldPlus,
    tone: "sky",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "sesiones_psicosocial",
    label: "Sesiones psicosocial",
    icon: UserRound,
    tone: "sky",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "raciones_entregadas",
    label: "Raciones entregadas",
    icon: UtensilsCrossed,
    tone: "coral",
    targetModuleId: "registro-alimentacion",
  },
  {
    id: "encuentro_intergeneracional",
    label: "Encuentros intergeneracionales",
    icon: CalendarDays,
    tone: "gold",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "nutricion",
    label: "Nutrición",
    icon: Apple,
    tone: "emerald",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "actividades_manualidad",
    label: "Manualidades",
    icon: Palette,
    tone: "gold",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "fisioterapia",
    label: "Fisioterapia",
    icon: Activity,
    tone: "ink",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "actividad_campo",
    label: "Actividades de campo",
    icon: MapPinned,
    tone: "sky",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "actividades_recreacion",
    label: "Actividades de recreación",
    icon: PartyPopper,
    tone: "coral",
    targetModuleId: "sesiones-grupales",
  },
] satisfies readonly HomeDashboardIndicatorDefinition[];
