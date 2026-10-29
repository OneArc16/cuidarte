import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  createNutricionFollowUpRequestSchema,
  createNutricionPlanRequestSchema,
  nutricionAdultoListQuerySchema,
  nutricionAdultoListResponseSchema,
  nutricionAdultoProfileResponseSchema,
  nutricionPlanDetailSchema,
  updateNutricionFollowUpRequestSchema,
  updateNutricionPlanRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { NutricionService } from "../application/nutricion.service";

const idParamSchema = z.uuid();

@ApiTags("nutricion")
@Controller("nutricion")
@UseGuards(SessionGuard)
export class NutricionController {
  constructor(private readonly nutricionService: NutricionService) {}

  @Get("adultos-mayores")
  @ApiOkResponse({ description: "Adultos mayores disponibles para gestión nutricional." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar nutrición." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async listAdultosMayores(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(nutricionAdultoListQuerySchema, query);
    return nutricionAdultoListResponseSchema.parse(
      await this.nutricionService.listAdultosMayores(parsedQuery, request.currentUser),
    );
  }

  @Get("adultos-mayores/:adultoMayorId")
  @ApiOkResponse({ description: "Perfil nutricional e historial de planes del adulto mayor." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar nutrición." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async getAdultoProfile(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    return nutricionAdultoProfileResponseSchema.parse(
      await this.nutricionService.getAdultoProfile(adultoMayorId, request.currentUser),
    );
  }

  @Get("planes/:planId")
  @ApiOkResponse({ description: "Detalle de un plan nutricional." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar nutrición." })
  @ApiNotFoundResponse({ description: "Plan nutricional no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async getPlan(@Param("planId") planIdParam: string, @Req() request: AuthenticatedRequest) {
    const planId = parseZodSchema(idParamSchema, planIdParam);
    return nutricionPlanDetailSchema.parse(
      await this.nutricionService.getPlan(planId, request.currentUser),
    );
  }

  @Post("planes")
  @ApiOkResponse({ description: "Plan nutricional creado." })
  @ApiBadRequestResponse({ description: "Solicitud inválida." })
  @ApiForbiddenResponse({ description: "El usuario no puede crear planes nutricionales." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async createPlan(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createNutricionPlanRequestSchema, body);
    return nutricionPlanDetailSchema.parse(
      await this.nutricionService.createPlan(command, request.currentUser),
    );
  }

  @Patch("planes/:planId")
  @ApiOkResponse({ description: "Plan nutricional actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud inválida." })
  @ApiConflictResponse({ description: "El plan fue modificado por otra persona." })
  @ApiForbiddenResponse({ description: "El usuario no puede editar este plan." })
  @ApiNotFoundResponse({ description: "Plan nutricional no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async updatePlan(
    @Param("planId") planIdParam: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const planId = parseZodSchema(idParamSchema, planIdParam);
    const command = parseZodSchema(updateNutricionPlanRequestSchema, body);
    return nutricionPlanDetailSchema.parse(
      await this.nutricionService.updatePlan(planId, command, request.currentUser),
    );
  }

  @Post("planes/:planId/seguimientos")
  @ApiOkResponse({ description: "Seguimiento nutricional creado." })
  @ApiBadRequestResponse({ description: "Solicitud inválida." })
  @ApiForbiddenResponse({ description: "El usuario no puede registrar seguimientos." })
  @ApiNotFoundResponse({ description: "Plan nutricional no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async createFollowUp(
    @Param("planId") planIdParam: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const planId = parseZodSchema(idParamSchema, planIdParam);
    const command = parseZodSchema(createNutricionFollowUpRequestSchema, body);
    return nutricionPlanDetailSchema.parse(
      await this.nutricionService.createFollowUp(planId, command, request.currentUser),
    );
  }

  @Patch("seguimientos/:followUpId")
  @ApiOkResponse({ description: "Seguimiento nutricional actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud inválida." })
  @ApiConflictResponse({ description: "El seguimiento fue modificado por otra persona." })
  @ApiForbiddenResponse({ description: "El usuario no puede editar este seguimiento." })
  @ApiNotFoundResponse({ description: "Seguimiento nutricional no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesión requerida." })
  async updateFollowUp(
    @Param("followUpId") followUpIdParam: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const followUpId = parseZodSchema(idParamSchema, followUpIdParam);
    const command = parseZodSchema(updateNutricionFollowUpRequestSchema, body);
    return nutricionPlanDetailSchema.parse(
      await this.nutricionService.updateFollowUp(followUpId, command, request.currentUser),
    );
  }
}
