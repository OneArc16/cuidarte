import { Module } from "@nestjs/common";

import { AdultosMayoresModule } from "./modules/adultos-mayores/adultos-mayores.module";
import { AlimentacionModule } from "./modules/alimentacion/alimentacion.module";
import { ActividadesGrupalesModule } from "./modules/actividades-grupales/actividades-grupales.module";
import { AtencionesIndividualesModule } from "./modules/atenciones-individuales/atenciones-individuales.module";
import { Cie10Module } from "./modules/cie10/cie10.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BackofficeModule } from "./modules/backoffice/backoffice.module";
import { EmpleadosModule } from "./modules/empleados/empleados.module";
import { HealthModule } from "./modules/health/health.module";
import { HomeModule } from "./modules/home/home.module";

@Module({
  imports: [
    AdultosMayoresModule,
    AlimentacionModule,
    ActividadesGrupalesModule,
    AtencionesIndividualesModule,
    Cie10Module,
    AuthModule,
    BackofficeModule,
    EmpleadosModule,
    HealthModule,
    HomeModule,
  ],
})
export class AppModule {}
