import { Module } from "@nestjs/common";

import { AdultosMayoresModule } from "./modules/adultos-mayores/adultos-mayores.module";
import { AlimentacionModule } from "./modules/alimentacion/alimentacion.module";
import { ActividadesGrupalesModule } from "./modules/actividades-grupales/actividades-grupales.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BackofficeModule } from "./modules/backoffice/backoffice.module";
import { EmpleadosModule } from "./modules/empleados/empleados.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [
    AdultosMayoresModule,
    AlimentacionModule,
    ActividadesGrupalesModule,
    AuthModule,
    BackofficeModule,
    EmpleadosModule,
    HealthModule,
  ],
})
export class AppModule {}
