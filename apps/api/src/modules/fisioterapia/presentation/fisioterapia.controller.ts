import { Body, Controller, Get, Param, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  createFisioterapiaSessionRequestSchema,
  fisioterapiaAdultoListQuerySchema,
  fisioterapiaAdultoListResponseSchema,
  fisioterapiaHistoryResponseSchema,
} from "@cuidarte/contracts";
import { z } from "zod";
import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { FisioterapiaService } from "../application/fisioterapia.service";

@ApiTags("fisioterapia")
@Controller("fisioterapia")
@UseGuards(SessionGuard)
export class FisioterapiaController {
  constructor(private readonly fisioterapiaService: FisioterapiaService) {}
  @Get("adultos-mayores")
  @ApiOkResponse({ description: "Adultos mayores disponibles para fisioterapia." })
  @ApiForbiddenResponse({ description: "Acceso denegado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    return fisioterapiaAdultoListResponseSchema.parse(
      await this.fisioterapiaService.listAdultosMayores(
        parseZodSchema(fisioterapiaAdultoListQuerySchema, query),
        request.currentUser,
      ),
    );
  }
  @Get("adultos-mayores/:adultoMayorId/historial")
  @ApiOkResponse({ description: "Historial de fisioterapia." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  async history(@Param("adultoMayorId") id: string, @Req() request: AuthenticatedRequest) {
    return fisioterapiaHistoryResponseSchema.parse(
      await this.fisioterapiaService.getHistory(parseZodSchema(z.uuid(), id), request.currentUser),
    );
  }
  @Post("sesiones")
  @ApiOkResponse({ description: "Sesión de fisioterapia registrada." })
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    return fisioterapiaHistoryResponseSchema.parse(
      await this.fisioterapiaService.createSession(
        parseZodSchema(createFisioterapiaSessionRequestSchema, body),
        request.currentUser,
      ),
    );
  }
}
