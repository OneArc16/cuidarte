import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  createTrabajoSocialSessionRequestSchema,
  trabajoSocialAdultoListQuerySchema,
  trabajoSocialAdultoListResponseSchema,
  trabajoSocialHistoryResponseSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { TrabajoSocialService } from "../application/trabajo-social.service";

@ApiTags("trabajo-social")
@Controller("trabajo-social")
@UseGuards(SessionGuard)
export class TrabajoSocialController {
  constructor(private readonly trabajoSocialService: TrabajoSocialService) {}

  @Get("adultos-mayores")
  @ApiOkResponse({ description: "Adultos mayores disponibles para trabajo social." })
  @ApiForbiddenResponse({ description: "Acceso denegado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return trabajoSocialAdultoListResponseSchema.parse(
      await this.trabajoSocialService.listAdultosMayores(
        parseZodSchema(trabajoSocialAdultoListQuerySchema, query),
        request.currentUser,
      ),
    );
  }

  @Get("adultos-mayores/:adultoMayorId/historial")
  @ApiOkResponse({ description: "Historial de atenciones de trabajo social." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  async history(@Param("adultoMayorId") id: string, @Req() request: AuthenticatedRequest) {
    return trabajoSocialHistoryResponseSchema.parse(
      await this.trabajoSocialService.getHistory(parseZodSchema(z.uuid(), id), request.currentUser),
    );
  }

  @Post("sesiones")
  @ApiOkResponse({ description: "Atención de trabajo social registrada." })
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return trabajoSocialHistoryResponseSchema.parse(
      await this.trabajoSocialService.createSession(
        parseZodSchema(createTrabajoSocialSessionRequestSchema, body),
        request.currentUser,
      ),
    );
  }
}
