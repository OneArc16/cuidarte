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
  createEmpleadoRequestSchema,
  empleadoDetailResponseSchema,
  empleadoListQuerySchema,
  empleadoListResponseSchema,
  empleadoTenantOptionsResponseSchema,
  updateEmpleadoRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { EmpleadosService } from "../application/empleados.service";

const empleadoIdParamSchema = z.uuid();

@ApiTags("empleados")
@Controller("empleados")
@UseGuards(SessionGuard)
export class EmpleadosController {
  constructor(private readonly empleadosService: EmpleadosService) {}

  @Get()
  @ApiOkResponse({ description: "Listado de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  async listEmpleados(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(empleadoListQuerySchema, query);
    const empleados = await this.empleadosService.listEmpleados(
      parsedQuery,
      request.currentUser,
    );

    return empleadoListResponseSchema.parse({ empleados });
  }

  @Get("tenant-options")
  @ApiOkResponse({ description: "Centros activos disponibles para crear usuarios." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listTenantOptions(@Req() request: AuthenticatedRequest) {
    const tenants = await this.empleadosService.listTenantOptions(request.currentUser);

    return empleadoTenantOptionsResponseSchema.parse({ tenants });
  }

  @Post()
  @ApiOkResponse({ description: "Usuario creado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Correo o documento duplicado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createEmpleado(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createEmpleadoRequestSchema, body);
    const detail = await this.empleadosService.createEmpleado(command, request.currentUser);

    return empleadoDetailResponseSchema.parse(detail);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Usuario actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Correo o documento duplicado." })
  @ApiNotFoundResponse({ description: "Usuario no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async updateEmpleado(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const empleadoId = parseZodSchema(empleadoIdParamSchema, id);
    const command = parseZodSchema(updateEmpleadoRequestSchema, body);
    const detail = await this.empleadosService.updateEmpleado(
      empleadoId,
      command,
      request.currentUser,
    );

    return empleadoDetailResponseSchema.parse(detail);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Detalle de empleado." })
  @ApiNotFoundResponse({ description: "Usuario no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos de empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getEmpleado(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const empleadoId = parseZodSchema(empleadoIdParamSchema, id);
    const detail = await this.empleadosService.getEmpleado(empleadoId, request.currentUser);

    return empleadoDetailResponseSchema.parse(detail);
  }
}
