import { Module } from "@nestjs/common";

import { AdultosMayoresModule } from "./modules/adultos-mayores/adultos-mayores.module";
import { AlimentacionModule } from "./modules/alimentacion/alimentacion.module";
import { ActividadesGrupalesModule } from "./modules/actividades-grupales/actividades-grupales.module";
import { AtencionesIndividualesModule } from "./modules/atenciones-individuales/atenciones-individuales.module";
import { AtencionesEnfermeriaModule } from "./modules/atenciones-enfermeria/atenciones-enfermeria.module";
import { Cie10Module } from "./modules/cie10/cie10.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BackofficeModule } from "./modules/backoffice/backoffice.module";
import { EmpleadosModule } from "./modules/empleados/empleados.module";
import { EpsModule } from "./modules/eps/eps.module";
import { HealthModule } from "./modules/health/health.module";
import { HomeModule } from "./modules/home/home.module";
import { UbicacionesModule } from "./modules/ubicaciones/ubicaciones.module";

@Module({
  imports: [
    AdultosMayoresModule,
    AlimentacionModule,
    ActividadesGrupalesModule,
    AtencionesIndividualesModule,
    AtencionesEnfermeriaModule,
    Cie10Module,
    AuthModule,
    BackofficeModule,
    EmpleadosModule,
    EpsModule,
    HealthModule,
    HomeModule,
    UbicacionesModule,
  ],
})
export class AppModule {}
