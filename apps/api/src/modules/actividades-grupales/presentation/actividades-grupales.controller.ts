import { Body, Controller, Get, Post, Query, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  actividadGrupalListItemSchema,
  actividadGrupalFormOptionsResponseSchema,
  actividadGrupalListQuerySchema,
  actividadGrupalListResponseSchema,
  actividadGrupalTenantOptionsResponseSchema,
  createActividadGrupalRequestSchema,
} from "@cuidarte/contracts";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { ActividadesGrupalesService } from "../application/actividades-grupales.service";

@ApiTags("actividades-grupales")
@Controller("actividades-grupales")
@UseGuards(SessionGuard)
export class ActividadesGrupalesController {
  constructor(private readonly actividadesGrupalesService: ActividadesGrupalesService) {}

  @Get()
  @ApiOkResponse({ description: "Listado de actividades grupales." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para consultar actividades." })
  async listActividadesGrupales(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(actividadGrupalListQuerySchema, query);
    const actividadesGrupales = await this.actividadesGrupalesService.listActividadesGrupales(
      parsedQuery,
      request.currentUser,
    );

    return actividadGrupalListResponseSchema.parse({ actividadesGrupales });
  }

  @Get("tenant-options")
  @ApiOkResponse({ description: "Centros activos disponibles para super admin." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listTenantOptions(@Req() request: AuthenticatedRequest) {
    const tenants = await this.actividadesGrupalesService.listTenantOptions(request.currentUser);

    return actividadGrupalTenantOptionsResponseSchema.parse({ tenants });
  }

  @Get("form-options")
  @ApiOkResponse({ description: "Opciones necesarias para crear una actividad grupal." })
  @ApiBadRequestResponse({ description: "Se requiere seleccionar un centro." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos sobre el centro solicitado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getFormOptions(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(
      actividadGrupalListQuerySchema.pick({ tenantId: true }),
      query,
    );
    const response = await this.actividadesGrupalesService.getFormOptions(
      parsedQuery,
      request.currentUser,
    );

    return actividadGrupalFormOptionsResponseSchema.parse(response);
  }

  @Post()
  @ApiOkResponse({ description: "Actividad grupal creada." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para crear actividades." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createActividadGrupal(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createActividadGrupalRequestSchema, body);
    const detail = await this.actividadesGrupalesService.createActividadGrupal(
      command,
      request.currentUser,
    );

    return actividadGrupalListItemSchema.parse(detail);
  }
}
