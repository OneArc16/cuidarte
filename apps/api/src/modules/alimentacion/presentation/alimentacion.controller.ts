import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
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
  alimentacionAdultoOptionsQuerySchema,
  alimentacionAdultoOptionsResponseSchema,
  alimentacionDetailSchema,
  alimentacionListQuerySchema,
  alimentacionListResponseSchema,
  alimentacionLookupByAdultoMayorQuerySchema,
  alimentacionLookupByAdultoMayorResponseSchema,
  alimentacionTenantOptionsResponseSchema,
  createAlimentacionBatchRequestSchema,
  createAlimentacionBatchResponseSchema,
  updateAlimentacionRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { AlimentacionService } from "../application/alimentacion.service";

const recordIdParamSchema = z.uuid();
const adultoMayorIdParamSchema = z.uuid();

@ApiTags("registro-alimentacion")
@Controller("registro-alimentacion")
@UseGuards(SessionGuard)
export class AlimentacionController {
  constructor(private readonly alimentacionService: AlimentacionService) {}

  @Get()
  @ApiOkResponse({ description: "Listado de registros de alimentacion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para consultar alimentacion." })
  async listRegistros(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(alimentacionListQuerySchema, query);
    const registros = await this.alimentacionService.listRegistros(
      parsedQuery,
      request.currentUser,
    );

    return alimentacionListResponseSchema.parse({ registros });
  }

  @Get("tenant-options")
  @ApiOkResponse({ description: "Centros activos disponibles para super admin." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listTenantOptions(@Req() request: AuthenticatedRequest) {
    const tenants = await this.alimentacionService.listTenantOptions(request.currentUser);

    return alimentacionTenantOptionsResponseSchema.parse({ tenants });
  }

  @Get("adultos-mayores-options")
  @ApiOkResponse({ description: "Opciones de adultos mayores para registrar alimentacion." })
  @ApiBadRequestResponse({ description: "Se requiere seleccionar un centro o una fecha valida." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar adultos mayores de otro centro." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async searchAdultosMayoresOptions(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const parsedQuery = parseZodSchema(alimentacionAdultoOptionsQuerySchema, query);
    const adultosMayores = await this.alimentacionService.searchAdultosMayoresOptions(
      parsedQuery,
      request.currentUser,
    );

    return alimentacionAdultoOptionsResponseSchema.parse({ adultosMayores });
  }

  @Get("adultos-mayores/:adultoMayorId/lookup")
  @ApiOkResponse({ description: "Lookup para precargar un adulto mayor en el alta de alimentacion." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar este adulto mayor." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async lookupAdultoMayorByDate(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, adultoMayorIdParam);
    const parsedQuery = parseZodSchema(alimentacionLookupByAdultoMayorQuerySchema, query);
    const result = await this.alimentacionService.lookupAdultoMayorByDate(
      adultoMayorId,
      parsedQuery,
      request.currentUser,
    );

    return alimentacionLookupByAdultoMayorResponseSchema.parse(result);
  }

  @Post()
  @ApiOkResponse({ description: "Lote de registros de alimentacion creado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Ya existen registros para alguno de los adultos en la fecha." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para crear registros." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createBatch(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createAlimentacionBatchRequestSchema, body);
    const response = await this.alimentacionService.createBatch(command, request.currentUser);

    return createAlimentacionBatchResponseSchema.parse(response);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Detalle editable de un registro de alimentacion." })
  @ApiNotFoundResponse({ description: "Registro no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede consultar el registro solicitado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getRegistro(@Param("id") idParam: string, @Req() request: AuthenticatedRequest) {
    const id = parseZodSchema(recordIdParamSchema, idParam);
    const record = await this.alimentacionService.getRegistro(id, request.currentUser);

    return alimentacionDetailSchema.parse(record);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Registro de alimentacion actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "La fecha seleccionada ya tiene un registro para este adulto." })
  @ApiNotFoundResponse({ description: "Registro no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede actualizar el registro solicitado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async updateRegistro(
    @Param("id") idParam: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const id = parseZodSchema(recordIdParamSchema, idParam);
    const command = parseZodSchema(updateAlimentacionRequestSchema, body);
    const record = await this.alimentacionService.updateRegistro(id, command, request.currentUser);

    return alimentacionDetailSchema.parse(record);
  }
}
