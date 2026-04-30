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
  description: string;
  icon: LucideIcon;
  tone: "emerald" | "sky" | "gold" | "coral" | "ink";
  targetModuleId: HomeDashboardShortcutModuleId;
};

export const HOME_DASHBOARD_INDICATORS = [
  {
    id: "adultos_registrados",
    label: "Adultos registrados",
    description: "Personas activas en seguimiento dentro del alcance actual.",
    icon: UsersRound,
    tone: "emerald",
    targetModuleId: "adultos-mayores",
  },
  {
    id: "salud_preventiva",
    label: "Salud preventiva",
    description: "Actividades preventivas registradas en sesiones grupales.",
    icon: ShieldPlus,
    tone: "sky",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "sesiones_psicosocial",
    label: "Sesiones psicosocial",
    description: "Intervenciones psicosociales registradas en el periodo acumulado.",
    icon: UserRound,
    tone: "sky",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "raciones_entregadas",
    label: "Raciones entregadas",
    description: "Suma de entregas marcadas como atendidas en alimentacion.",
    icon: UtensilsCrossed,
    tone: "coral",
    targetModuleId: "registro-alimentacion",
  },
  {
    id: "encuentro_intergeneracional",
    label: "Encuentros intergeneracionales",
    description: "Actividades compartidas entre generaciones registradas.",
    icon: CalendarDays,
    tone: "gold",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "nutricion",
    label: "Nutrición",
    description: "Sesiones nutricionales registradas dentro del centro.",
    icon: Apple,
    tone: "emerald",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "actividades_manualidad",
    label: "Manualidades",
    description: "Actividades de manualidad reportadas en sesiones grupales.",
    icon: Palette,
    tone: "gold",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "fisioterapia",
    label: "Fisioterapia",
    description: "Sesiones de fisioterapia registradas en el alcance actual.",
    icon: Activity,
    tone: "ink",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "actividad_campo",
    label: "Actividades de campo",
    description: "Jornadas externas o territoriales asociadas al centro.",
    icon: MapPinned,
    tone: "sky",
    targetModuleId: "sesiones-grupales",
  },
  {
    id: "actividades_recreacion",
    label: "Actividades de recreación",
    description: "Espacios ludicos y recreativos cargados en el sistema.",
    icon: PartyPopper,
    tone: "coral",
    targetModuleId: "sesiones-grupales",
  },
] satisfies readonly HomeDashboardIndicatorDefinition[];
