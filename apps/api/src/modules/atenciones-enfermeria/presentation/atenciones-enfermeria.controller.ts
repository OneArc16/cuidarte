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
  atencionEnfermeriaDetailSchema,
  atencionEnfermeriaHistoryResponseSchema,
  atencionEnfermeriaListQuerySchema,
  atencionEnfermeriaListResponseSchema,
  atencionEnfermeriaLookupResponseSchema,
  createAtencionEnfermeriaRequestSchema,
  atencionEnfermeriaCrossReadRoleValues,
  updateAtencionEnfermeriaRequestSchema,
  atencionEnfermeriaModuleRoleValues,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { RequireRoles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { SessionGuard } from "../../auth/session.guard";
import { AtencionesEnfermeriaService } from "../application/atenciones-enfermeria.service";

const idParamSchema = z.uuid();

@ApiTags("atenciones-enfermeria")
@Controller("atenciones-enfermeria")
@UseGuards(SessionGuard, RolesGuard)
@RequireRoles(...atencionEnfermeriaModuleRoleValues)
export class AtencionesEnfermeriaController {
  constructor(private readonly atencionesService: AtencionesEnfermeriaService) {}

  @Get()
  @RequireRoles(...atencionEnfermeriaCrossReadRoleValues)
  @ApiOkResponse({ description: "Listado de atenciones de enfermeria dentro del alcance." })
  @ApiForbiddenResponse({ description: "El usuario no puede acceder a este modulo." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listAtenciones(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(atencionEnfermeriaListQuerySchema, query);
    const result = await this.atencionesService.listAtenciones(parsedQuery, request.currentUser);

    return atencionEnfermeriaListResponseSchema.parse(result);
  }

  @Get("adultos-mayores/:adultoMayorId/lookup")
  @ApiOkResponse({ description: "Resumen del adulto mayor para iniciar una atencion." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede crear atenciones de enfermeria." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async lookupAdultoMayor(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    const result = await this.atencionesService.lookupAdultoMayor(
      adultoMayorId,
      request.currentUser,
    );

    return atencionEnfermeriaLookupResponseSchema.parse(result);
  }

  @Get("adultos-mayores/:adultoMayorId/history")
  @RequireRoles(...atencionEnfermeriaCrossReadRoleValues)
  @ApiOkResponse({ description: "Historia de atenciones de enfermeria del adulto mayor." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar esta historia." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getHistoriaClinica(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    const result = await this.atencionesService.getHistoriaClinica(
      adultoMayorId,
      request.currentUser,
    );

    return atencionEnfermeriaHistoryResponseSchema.parse(result);
  }

  @Get(":id")
  @RequireRoles(...atencionEnfermeriaCrossReadRoleValues)
  @ApiOkResponse({ description: "Detalle de atencion de enfermeria." })
  @ApiNotFoundResponse({ description: "Atencion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar esta atencion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getAtencion(@Param("id") idParam: string, @Req() request: AuthenticatedRequest) {
    const id = parseZodSchema(idParamSchema, idParam);
    const record = await this.atencionesService.getAtencion(id, request.currentUser);

    return atencionEnfermeriaDetailSchema.parse(record);
  }

  @Get("adultos-mayores/:adultoMayorId/trash")
  @RequireRoles("super_admin", "admin", "director")
  async getPapelera(@Param("adultoMayorId") adultoMayorIdParam: string, @Req() request: AuthenticatedRequest) {
    const adultoMayorId = parseZodSchema(idParamSchema, adultoMayorIdParam);
    return atencionEnfermeriaHistoryResponseSchema.parse(
      await this.atencionesService.getPapelera(adultoMayorId, request.currentUser),
    );
  }

  @Post(":id/trash")
  @RequireRoles("super_admin", "admin", "director")
  async deleteAtencion(@Param("id") idParam: string, @Req() request: AuthenticatedRequest) {
    const id = parseZodSchema(idParamSchema, idParam);
    return this.atencionesService.deleteAtencion(id, request.currentUser);
  }

  @Post(":id/restore")
  @RequireRoles("super_admin", "admin", "director")
  async restoreAtencion(@Param("id") idParam: string, @Req() request: AuthenticatedRequest) {
    const id = parseZodSchema(idParamSchema, idParam);
    return this.atencionesService.restoreAtencion(id, request.currentUser);
  }

  @Post()
  @ApiOkResponse({ description: "Atencion de enfermeria creada." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiForbiddenResponse({ description: "El usuario no puede crear atenciones de enfermeria." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createAtencion(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createAtencionEnfermeriaRequestSchema, body);
    const record = await this.atencionesService.createAtencion(command, request.currentUser);

    return atencionEnfermeriaDetailSchema.parse(record);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Atencion de enfermeria actualizada." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Version desactualizada." })
  @ApiForbiddenResponse({ description: "El usuario no puede editar esta atencion." })
  @ApiNotFoundResponse({ description: "Atencion no encontrada." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async updateAtencion(
    @Param("id") idParam: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const id = parseZodSchema(idParamSchema, idParam);
    const command = parseZodSchema(updateAtencionEnfermeriaRequestSchema, body);
    const record = await this.atencionesService.updateAtencion(id, command, request.currentUser);

    return atencionEnfermeriaDetailSchema.parse(record);
  }
}
