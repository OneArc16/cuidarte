import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  createPsicologiaSessionRequestSchema,
  psicologiaAdultoListQuerySchema,
  psicologiaAdultoListResponseSchema,
  psicologiaHistoryResponseSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { PsicologiaService } from "../application/psicologia.service";

@ApiTags("psicologia")
@Controller("psicologia")
@UseGuards(SessionGuard)
export class PsicologiaController {
  constructor(private readonly psicologiaService: PsicologiaService) {}
  @Get("adultos-mayores")
  @ApiOkResponse({ description: "Adultos mayores disponibles para psicología." })
  @ApiForbiddenResponse({ description: "Acceso denegado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return psicologiaAdultoListResponseSchema.parse(
      await this.psicologiaService.listAdultosMayores(
        parseZodSchema(psicologiaAdultoListQuerySchema, query),
        request.currentUser,
      ),
    );
  }
  @Get("adultos-mayores/:adultoMayorId/historial")
  @ApiOkResponse({ description: "Historial de sesiones de psicología." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  async history(@Param("adultoMayorId") id: string, @Req() request: AuthenticatedRequest) {
    return psicologiaHistoryResponseSchema.parse(
      await this.psicologiaService.getHistory(parseZodSchema(z.uuid(), id), request.currentUser),
    );
  }
  @Post("sesiones")
  @ApiOkResponse({ description: "Sesión de psicología registrada." })
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return psicologiaHistoryResponseSchema.parse(
      await this.psicologiaService.createSession(
        parseZodSchema(createPsicologiaSessionRequestSchema, body),
        request.currentUser,
      ),
    );
  }
}
