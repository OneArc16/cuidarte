import { Module } from "@nestjs/common";

import { AdultosMayoresModule } from "./modules/adultos-mayores/adultos-mayores.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BackofficeModule } from "./modules/backoffice/backoffice.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [AdultosMayoresModule, AuthModule, BackofficeModule, HealthModule],
})
export class AppModule {}
