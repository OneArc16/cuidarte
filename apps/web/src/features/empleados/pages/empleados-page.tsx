import { type AuthUser } from "@cuidarte/contracts";
import { ChevronLeft } from "lucide-react";

import { type Navigate } from "@/app/hooks/use-app-navigation";

import {
  EMPLEADOS_NEW_PATH,
  EMPLEADOS_PATH,
  getEmpleadoEditIdFromPath,
} from "../lib/empleados-paths";
import { EmpleadoCreatePage } from "./empleado-create-page";
import { EmpleadoEditPage } from "./empleado-edit-page";
import { EmpleadosIndexPage } from "./empleados-index-page";

type EmpleadosPageProps = {
  navigate: Navigate;
  path: string;
  user: AuthUser;
};

export function EmpleadosPage({ navigate, path, user }: EmpleadosPageProps) {
  if (path === EMPLEADOS_PATH) {
    return <EmpleadosIndexPage navigate={navigate} user={user} />;
  }

  if (path === EMPLEADOS_NEW_PATH) {
    return <EmpleadoCreatePage navigate={navigate} user={user} />;
  }

  const empleadoId = getEmpleadoEditIdFromPath(path);

  if (empleadoId !== null) {
    return <EmpleadoEditPage empleadoId={empleadoId} navigate={navigate} user={user} />;
  }

  return (
    <section className="empleados-empty" aria-labelledby="empleados-not-found-title">
      <p className="eyebrow">Gestion de empleados</p>
      <h2 id="empleados-not-found-title">Ruta no encontrada</h2>
      <button className="outline-action" type="button" onClick={() => navigate(EMPLEADOS_PATH)}>
        <ChevronLeft aria-hidden="true" />
        <span>Volver</span>
      </button>
    </section>
  );
}
