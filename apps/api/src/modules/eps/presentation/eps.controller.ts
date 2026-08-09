import { epsListResponseSchema } from "@cuidarte/contracts";
import { Controller, Get, Req, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";

import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { EpsService } from "../application/eps.service";

@ApiTags("eps")
@Controller("eps")
@UseGuards(SessionGuard)
export class EpsController {
  constructor(private readonly epsService: EpsService) {}

  @Get()
  @ApiOkResponse({ description: "Listado de EPS activas." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async list(@Req() _request: AuthenticatedRequest) {
    const eps = await this.epsService.listActive();

    return epsListResponseSchema.parse({ eps });
  }
}
