import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { TrabajoSocialService } from "./application/trabajo-social.service";
import { TrabajoSocialController } from "./presentation/trabajo-social.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [TrabajoSocialController],
  providers: [TrabajoSocialService],
})
export class TrabajoSocialModule {}
