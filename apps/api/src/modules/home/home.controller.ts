import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { homeDashboardResponseSchema } from "@cuidarte/contracts";

import { type AuthenticatedRequest } from "../auth/authenticated-request";
import { SessionGuard } from "../auth/session.guard";
import { HomeService } from "./home.service";

@ApiTags("home")
@Controller("home")
@UseGuards(SessionGuard)
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  @Get("dashboard")
  @ApiOkResponse({ description: "Resumen operativo para la pantalla de inicio." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para acceder al dashboard." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getDashboard(@Req() request: AuthenticatedRequest) {
    const dashboard = await this.homeService.getDashboard(request.currentUser);

    return homeDashboardResponseSchema.parse(dashboard);
  }
}
