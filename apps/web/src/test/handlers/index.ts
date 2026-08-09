import { actividadesHandlers } from "./actividades.handlers";
import { adultosMayoresHandlers } from "./adultos-mayores.handlers";
import { alimentacionHandlers } from "./alimentacion.handlers";
import { atencionesHandlers } from "./atenciones.handlers";
import { backofficeHandlers } from "./backoffice.handlers";
import { cie10Handlers } from "./cie10.handlers";
import { empleadosHandlers } from "./empleados.handlers";
import { epsHandlers } from "./eps.handlers";
import { healthAuthHandlers } from "./health-auth.handlers";
import { homeHandlers } from "./home.handlers";
import { ubicacionesHandlers } from "./ubicaciones.handlers";

export const defaultHandlers = [
  ...healthAuthHandlers,
  ...homeHandlers,
  ...backofficeHandlers,
  ...adultosMayoresHandlers,
  ...atencionesHandlers,
  ...cie10Handlers,
  ...empleadosHandlers,
  ...epsHandlers,
  ...actividadesHandlers,
  ...alimentacionHandlers,
  ...ubicacionesHandlers,
];
