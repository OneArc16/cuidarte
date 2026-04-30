import { Module } from "@nestjs/common";

import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { HomeController } from "./home.controller";
import { HomeService } from "./home.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
