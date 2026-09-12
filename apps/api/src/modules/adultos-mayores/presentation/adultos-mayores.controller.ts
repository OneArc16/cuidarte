import {
  Body,
  BadRequestException,
  Controller,
  Delete,
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
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import {
  adultoMayorDetailResponseSchema,
  adultoMayorListQuerySchema,
  adultoMayorListResponseSchema,
  adultoMayorTrashListResponseSchema,
  adultoMayorTrashMutationResponseSchema,
  adultoMayorTenantOptionsResponseSchema,
  adultoMayorStatusHistoryQuerySchema,
  adultoMayorStatusHistoryResponseSchema,
  createAdultoMayorRequestSchema,
  updateAdultoMayorRequestSchema,
  sendAdultoMayorToTrashRequestSchema,
} from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { AdultosMayoresExportService } from "../application/adultos-mayores-export.service";
import { AdultosMayoresService } from "../application/adultos-mayores.service";
import { type AdultoMayorPdfUpload } from "../domain/adultos-mayores-files.storage";

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart(): boolean;
  parts(): AsyncIterableIterator<Multipart>;
};

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

  @Get("trash")
  @ApiOkResponse({ description: "Listado de adultos mayores enviados a papelera." })
  async listTrashAdultosMayores(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(adultoMayorListQuerySchema, query);
    const adultosMayores = await this.adultosMayoresService.listTrashAdultosMayores(
      parsedQuery,
      request.currentUser,
    );

    return adultoMayorTrashListResponseSchema.parse({ adultosMayores });
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

  @Get(":id/historial-estados")
  @ApiOkResponse({ description: "Historial de estados del adulto mayor." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  async getStatusHistory(
    @Param("id") id: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    const parsedQuery = parseZodSchema(adultoMayorStatusHistoryQuerySchema, query);
    const history = await this.adultosMayoresService.getStatusHistory(
      adultoMayorId,
      parsedQuery,
      request.currentUser,
    );

    return adultoMayorStatusHistoryResponseSchema.parse(history);
  }

  @Delete(":id")
  @ApiOkResponse({ description: "Adulto mayor enviado a papelera." })
  async sendAdultoMayorToTrash(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    const command = parseZodSchema(sendAdultoMayorToTrashRequestSchema, body);
    await this.adultosMayoresService.sendAdultoMayorToTrash(
      adultoMayorId,
      command,
      request.currentUser,
    );

    return adultoMayorTrashMutationResponseSchema.parse({ success: true });
  }

  @Post(":id/restore")
  @ApiOkResponse({ description: "Adulto mayor restaurado desde papelera." })
  async restoreAdultoMayor(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    await this.adultosMayoresService.restoreAdultoMayor(adultoMayorId, request.currentUser);

    return adultoMayorTrashMutationResponseSchema.parse({ success: true });
  }

  @Post(":id/document")
  @ApiOkResponse({ description: "PDF del adulto mayor cargado." })
  @ApiBadRequestResponse({ description: "Solo se permite un PDF de hasta 10 MB." })
  async uploadDocument(@Param("id") id: string, @Req() request: MultipartAuthenticatedRequest) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    const file = await parsePdfMultipartRequest(request);
    const document = await this.adultosMayoresService.uploadDocument(
      adultoMayorId,
      file,
      request.currentUser,
    );

    return { document };
  }

  @Get(":id/document")
  @ApiOkResponse({ description: "PDF del adulto mayor." })
  async downloadDocument(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    const file = await this.adultosMayoresService.downloadDocument(
      adultoMayorId,
      request.currentUser,
    );
    reply.header("Content-Type", file.contentType);
    reply.header("Content-Disposition", `inline; filename="${file.filename}"`);
    return reply.send(file.buffer);
  }

  @Delete(":id/document")
  @ApiOkResponse({ description: "PDF del adulto mayor eliminado." })
  async deleteDocument(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, id);
    await this.adultosMayoresService.deleteDocument(adultoMayorId, request.currentUser);
    return { success: true };
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

async function parsePdfMultipartRequest(
  request: MultipartAuthenticatedRequest,
): Promise<AdultoMayorPdfUpload> {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let upload: AdultoMayorPdfUpload | null = null;

  for await (const part of request.parts()) {
    if (part.type === "field" || part.fieldname !== "document") {
      throw new BadRequestException("El formulario solo admite un campo PDF llamado document.");
    }
    if (upload !== null) throw new BadRequestException("Solo puedes adjuntar un PDF.");
    const buffer = await (part as MultipartFile).toBuffer();
    upload = {
      originalName: part.filename.trim() === "" ? "documento.pdf" : part.filename,
      mimeType: part.mimetype,
      sizeBytes: buffer.byteLength,
      buffer,
    };
  }

  if (upload === null) throw new BadRequestException("Selecciona un archivo PDF.");
  return upload;
}

function sendFile(
  reply: FastifyReply,
  file: { buffer: Buffer; contentType: string; filename: string },
) {
  reply.header("Content-Type", file.contentType);
  reply.header("Content-Disposition", `attachment; filename="${file.filename}"`);

  return reply.send(file.buffer);
}
