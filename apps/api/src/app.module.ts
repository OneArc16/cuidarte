import { Module } from "@nestjs/common";

import { AuthModule } from "./modules/auth/auth.module";
import { BackofficeModule } from "./modules/backoffice/backoffice.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
  imports: [AuthModule, BackofficeModule, HealthModule],
})
export class AppModule {}
