import { Module } from "@nestjs/common";

import { AdultosMayoresModule } from "./modules/adultos-mayores/adultos-mayores.module";
import { AlimentacionModule } from "./modules/alimentacion/alimentacion.module";
import { ActividadGrupalTiposModule } from "./modules/actividad-grupal-tipos/actividad-grupal-tipos.module";
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
import { ReportsModule } from "./modules/reports/reports.module";
import { UbicacionesModule } from "./modules/ubicaciones/ubicaciones.module";

@Module({
  imports: [
    AdultosMayoresModule,
    AlimentacionModule,
    ActividadGrupalTiposModule,
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
    ReportsModule,
    UbicacionesModule,
  ],
})
export class AppModule {}
