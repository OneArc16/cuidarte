import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  adultoMayorDetailResponseSchema,
  adultoMayorListQuerySchema,
  adultoMayorListResponseSchema,
  adultoMayorTenantOptionsResponseSchema,
  createAdultoMayorRequestSchema,
  updateAdultoMayorRequestSchema,
} from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { AdultosMayoresExportService } from "../application/adultos-mayores-export.service";
import { AdultosMayoresService } from "../application/adultos-mayores.service";

const adultoMayorIdParamSchema = z.uuid();

@ApiTags("adultos-mayores")
@Controller("adultos-mayores")
@UseGuards(SessionGuard)
export class AdultosMayoresController {
  constructor(
    private readonly adultosMayoresService: AdultosMayoresService,
    private readonly adultosMayoresExportService: AdultosMayoresExportService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Listado de adultos mayores." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listAdultosMayores(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(adultoMayorListQuerySchema, query);
    const adultosMayores = await this.adultosMayoresService.listAdultosMayores(
      parsedQuery,
      request.currentUser,
    );

    return adultoMayorListResponseSchema.parse({ adultosMayores });
  }

  @Get("tenant-options")
  @ApiOkResponse({ description: "Centros activos disponibles para crear adultos mayores." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listTenantOptions(@Req() request: AuthenticatedRequest) {
    const tenants = await this.adultosMayoresService.listTenantOptions(request.currentUser);

    return adultoMayorTenantOptionsResponseSchema.parse({ tenants });
  }

  @Post()
  @ApiOkResponse({ description: "Adulto mayor creado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({ description: "Documento duplicado en el centro." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async createAdultoMayor(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createAdultoMayorRequestSchema, body);
    const detail = await this.adultosMayoresService.createAdultoMayor(command, request.currentUser);

    return adultoMayorDetailResponseSchema.parse(detail);
  }

  @Patch(":id")
  @ApiOkResponse({ description: "Adulto mayor actualizado." })
  @ApiConflictResponse({ description: "Documento duplicado en el centro." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async updateAdultoMayor(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    const command = parseZodSchema(updateAdultoMayorRequestSchema, body);
    const detail = await this.adultosMayoresService.updateAdultoMayor(
      adultoMayorId,
      command,
      request.currentUser,
    );

    return adultoMayorDetailResponseSchema.parse(detail);
  }

  @Get("export/excel")
  @ApiOkResponse({ description: "Archivo Excel con el listado de adultos mayores." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async exportExcel(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const parsedQuery = parseZodSchema(adultoMayorListQuerySchema, query);
    const file = await this.adultosMayoresExportService.exportExcel(
      parsedQuery,
      request.currentUser,
    );

    return sendFile(reply, file);
  }

  @Get("export/pdf")
  @ApiOkResponse({ description: "Archivo PDF con el listado de adultos mayores." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async exportPdf(
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const parsedQuery = parseZodSchema(adultoMayorListQuerySchema, query);
    const file = await this.adultosMayoresExportService.exportPdf(parsedQuery, request.currentUser);

    return sendFile(reply, file);
  }

  @Get(":id")
  @ApiOkResponse({ description: "Detalle de adulto mayor." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getAdultoMayor(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    const detail = await this.adultosMayoresService.getAdultoMayor(
      adultoMayorId,
      request.currentUser,
    );

    return adultoMayorDetailResponseSchema.parse(detail);
  }
}

function sendFile(
  reply: FastifyReply,
  file: { buffer: Buffer; contentType: string; filename: string },
) {
  reply.header("Content-Type", file.contentType);
  reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);

  return reply.send(file.buffer);
}
