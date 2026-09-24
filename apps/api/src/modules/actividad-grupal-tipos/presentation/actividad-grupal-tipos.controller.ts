import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { ApiConflictResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  actividadGrupalGlobalSeriesSchema,
  actividadGrupalTiposGlobalConsecutiveConfigResponseSchema,
  actividadGrupalTipoCreatorOptionsResponseSchema,
  actividadGrupalTipoSchema,
  actividadGrupalTiposListQuerySchema,
  actividadGrupalTiposListResponseSchema,
  createActividadGrupalTipoRequestSchema,
  updateActividadGrupalTipoRequestSchema,
  updateActividadGrupalTipoStatusRequestSchema,
  updateActividadGrupalGlobalSeriesRequestSchema,
  updateActividadGrupalTipoConsecutiveConfigRequestSchema,
  updateActividadGrupalTipoGlobalConsecutiveConfigRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { RolesGuard } from "../../auth/roles.guard";
import { SessionGuard } from "../../auth/session.guard";
import { ActividadGrupalGlobalSeriesService } from "../application/actividad-grupal-global-series.service";
import { ActividadGrupalTiposService } from "../application/actividad-grupal-tipos.service";

const idParamSchema = z.uuid();

@ApiTags("actividad-grupal-tipos")
@Controller("actividad-grupal-tipos")
@UseGuards(SessionGuard, RolesGuard)
export class ActividadGrupalTiposController {
  constructor(
    private readonly actividadGrupalTiposService: ActividadGrupalTiposService,
    private readonly actividadGrupalGlobalSeriesService: ActividadGrupalGlobalSeriesService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Listado de tipos de actividad grupal." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos." })
  async list(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(actividadGrupalTiposListQuerySchema, query);
    const activityTypes = await this.actividadGrupalTiposService.list(
      parsedQuery,
      request.currentUser,
    );

    return actividadGrupalTiposListResponseSchema.parse({ activityTypes });
  }

  @Get("global-series")
  @ApiOkResponse({ description: "Configuracion global de la serie de actas." })
  @ApiForbiddenResponse({ description: "Solo Superadmin puede consultar la serie global." })
  async getGlobalSeries(@Req() request: AuthenticatedRequest) {
    const series = await this.actividadGrupalGlobalSeriesService.get(request.currentUser);

    return actividadGrupalGlobalSeriesSchema.parse(series);
  }

  @Patch("global-series")
  @ApiOkResponse({ description: "Configuracion global de la serie actualizada." })
  @ApiForbiddenResponse({ description: "Solo Superadmin puede actualizar la serie global." })
  async updateGlobalSeries(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(updateActividadGrupalGlobalSeriesRequestSchema, body);
    const series = await this.actividadGrupalGlobalSeriesService.update(
      command,
      request.currentUser,
    );

    return actividadGrupalGlobalSeriesSchema.parse(series);
  }

  @Patch("global-consecutive-config")
  @ApiOkResponse({ description: "Prefijo de una actividad actualizado en todos los centros." })
  @ApiForbiddenResponse({ description: "Solo Superadmin puede actualizar todos los centros." })
  async updateGlobalConsecutiveConfig(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(
      updateActividadGrupalTipoGlobalConsecutiveConfigRequestSchema,
      body,
    );
    const activityTypes = await this.actividadGrupalTiposService.updateGlobalConsecutiveConfig(
      command,
      request.currentUser,
    );

    return actividadGrupalTiposGlobalConsecutiveConfigResponseSchema.parse({ activityTypes });
  }
  @Post()
  @ApiOkResponse({ description: "Tipo de actividad creado." })
  @ApiConflictResponse({ description: "Nombre duplicado en el centro." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos." })
  async create(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createActividadGrupalTipoRequestSchema, body);
    const activityType = await this.actividadGrupalTiposService.create(
      command,
      request.currentUser,
    );

    return actividadGrupalTipoSchema.parse(activityType);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Tipo de actividad actualizado." })
  @ApiConflictResponse({ description: "Nombre duplicado en el centro." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos." })
  async update(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const activityTypeId = parseZodSchema(idParamSchema, id);
    const command = parseZodSchema(updateActividadGrupalTipoRequestSchema, body);
    const activityType = await this.actividadGrupalTiposService.update(
      activityTypeId,
      command,
      request.currentUser,
    );

    return actividadGrupalTipoSchema.parse(activityType);
  }

  @Get(":id/consecutive-creators")
  @ApiOkResponse({ description: "Personas activas disponibles para crear la actividad." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos." })
  async listConsecutiveCreators(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const activityTypeId = parseZodSchema(idParamSchema, id);
    const creators = await this.actividadGrupalTiposService.listCreatorOptions(
      activityTypeId,
      request.currentUser,
    );

    return actividadGrupalTipoCreatorOptionsResponseSchema.parse({ creators });
  }

  @Patch(":id/consecutive-config")
  @ApiOkResponse({ description: "Consecutivo especial configurado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos." })
  async updateConsecutiveConfig(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const activityTypeId = parseZodSchema(idParamSchema, id);
    const command = parseZodSchema(updateActividadGrupalTipoConsecutiveConfigRequestSchema, body);
    const activityType = await this.actividadGrupalTiposService.updateConsecutiveConfig(
      activityTypeId,
      command,
      request.currentUser,
    );

    return actividadGrupalTipoSchema.parse(activityType);
  }

  @Patch(":id/status")
  @ApiOkResponse({ description: "Estado del tipo de actividad actualizado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos." })
  async updateStatus(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const activityTypeId = parseZodSchema(idParamSchema, id);
    const command = parseZodSchema(updateActividadGrupalTipoStatusRequestSchema, body);
    const activityType = await this.actividadGrupalTiposService.updateStatus(
      activityTypeId,
      command,
      request.currentUser,
    );

    return actividadGrupalTipoSchema.parse(activityType);
  }
}
