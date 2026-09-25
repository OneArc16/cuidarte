import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  PayloadTooLargeException,
  Query,
  Req,
  Res,
  Optional,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  alimentacionAdultoOptionsQuerySchema,
  alimentacionAdultoOptionsResponseSchema,
  alimentacionDetailSchema,
  alimentacionFormatoEntregaExportQuerySchema,
  alimentacionBulkImportValidateQuerySchema,
  alimentacionBulkImportValidateResponseSchema,
  alimentacionBulkImportConfirmRequestSchema,
  alimentacionBulkImportConfirmResponseSchema,
  alimentacionImportedFormatoUploadResponseSchema,
  alimentacionImportedFormatoVersionsResponseSchema,
  alimentacionListQuerySchema,
  alimentacionListResponseSchema,
  alimentacionLookupByAdultoMayorQuerySchema,
  alimentacionLookupByAdultoMayorResponseSchema,
  alimentacionTenantOptionsResponseSchema,
  deleteAlimentacionResponseSchema,
  createAlimentacionBatchRequestSchema,
  createAlimentacionBatchResponseSchema,
  updateAlimentacionRequestSchema,
} from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { AlimentacionFormatoExportService } from "../application/alimentacion-formato-export.service";
import { AlimentacionImportedFormatoService } from "../application/alimentacion-imported-formato.service";
import { AlimentacionBulkImportService } from "../application/alimentacion-bulk-import.service";
import { AlimentacionService } from "../application/alimentacion.service";
import { type BufferedAlimentacionFormatoPdfUpload } from "../domain/alimentacion.types";

const recordIdParamSchema = z.uuid();
const adultoMayorIdParamSchema = z.uuid();
const importedVersionIdParamSchema = z.uuid();
const bulkImportBatchIdParamSchema = z.uuid();

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@ApiTags("registro-alimentacion")
@Controller("registro-alimentacion")
@UseGuards(SessionGuard)
export class AlimentacionController {
  constructor(
    private readonly alimentacionService: AlimentacionService,
    private readonly alimentacionFormatoExportService: AlimentacionFormatoExportService,
    private readonly alimentacionImportedFormatoService: AlimentacionImportedFormatoService,
    @Optional() private readonly alimentacionBulkImportService?: AlimentacionBulkImportService,
  ) {}

  @Get()
  @ApiOkResponse({ description: "Listado de registros de alimentacion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({
    description: "El usuario no tiene permisos para consultar alimentacion.",
  })
  async listRegistros(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(alimentacionListQuerySchema, query);
    const registros = await this.alimentacionService.listRegistros(
      parsedQuery,
      request.currentUser,
    );

    return alimentacionListResponseSchema.parse({ registros });
  }

  @Post("formato-entrega/imported-pdfs/batch/validate")
  @ApiConsumes("multipart/form-data")
  async validateBulkImportedFormatoPdfs(
    @Query() query: unknown,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const parsedQuery = parseZodSchema(alimentacionBulkImportValidateQuerySchema, query);
    const uploads = await parseBulkImportedFormatoMultipartRequest(request);
    return alimentacionBulkImportValidateResponseSchema.parse(
      await this.alimentacionBulkImportService!.validate(parsedQuery, uploads, request.currentUser),
    );
  }

  @Post("formato-entrega/imported-pdfs/batch/confirm")
  async confirmBulkImportedFormatoPdfs(
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const command = parseZodSchema(alimentacionBulkImportConfirmRequestSchema, body);
    return alimentacionBulkImportConfirmResponseSchema.parse(
      await this.alimentacionBulkImportService!.confirm(command, request.currentUser),
    );
  }

  @Get("formato-entrega/imported-pdfs/batch/:batchId")
  async getBulkImportedFormatoBatch(
    @Param("batchId") batchIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const batchId = parseZodSchema(bulkImportBatchIdParamSchema, batchIdParam);
    return alimentacionBulkImportValidateResponseSchema.parse(
      await this.alimentacionBulkImportService!.get(batchId, request.currentUser),
    );
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
  @ApiForbiddenResponse({
    description: "El usuario no puede consultar adultos mayores de otro centro.",
  })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async searchAdultosMayoresOptions(@Query() query: unknown, @Req() request: AuthenticatedRequest) {
    const parsedQuery = parseZodSchema(alimentacionAdultoOptionsQuerySchema, query);
    const adultosMayores = await this.alimentacionService.searchAdultosMayoresOptions(
      parsedQuery,
      request.currentUser,
    );

    return alimentacionAdultoOptionsResponseSchema.parse({ adultosMayores });
  }

  @Get("adultos-mayores/:adultoMayorId/lookup")
  @ApiOkResponse({
    description: "Lookup para precargar un adulto mayor en el alta de alimentacion.",
  })
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

  @Get("adultos-mayores/:adultoMayorId/formato-entrega/pdf")
  @ApiOkResponse({ description: "PDF de formato individual de entrega de alimentos." })
  @ApiBadRequestResponse({ description: "deliveryMonth invalido o faltante." })
  @ApiForbiddenResponse({ description: "No tienes permisos para exportar este formato." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiProduces("application/pdf")
  async exportFormatoEntregaPdf(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, adultoMayorIdParam);
    const parsedQuery = parseZodSchema(alimentacionFormatoEntregaExportQuerySchema, query);
    const file = await this.alimentacionFormatoExportService.exportPdf(
      adultoMayorId,
      parsedQuery,
      request.currentUser,
    );

    return sendFile(reply, file, "inline");
  }

  @Post("adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs")
  @ApiOkResponse({ description: "PDF diligenciado importado como una nueva version." })
  @ApiConsumes("multipart/form-data")
  @ApiBadRequestResponse({ description: "Archivo PDF o mes invalido." })
  @ApiForbiddenResponse({ description: "No tienes permisos para importar este formato." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async importFormatoEntregaPdf(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Query() query: unknown,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, adultoMayorIdParam);
    const parsedQuery = parseZodSchema(alimentacionFormatoEntregaExportQuerySchema, query);
    const upload = await parseImportedFormatoMultipartRequest(request);
    const response = await this.alimentacionImportedFormatoService.importPdf(
      adultoMayorId,
      parsedQuery,
      upload,
      request.currentUser,
    );

    return alimentacionImportedFormatoUploadResponseSchema.parse(response);
  }

  @Get("adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs")
  @ApiOkResponse({ description: "Historial de PDFs diligenciados importados." })
  @ApiBadRequestResponse({ description: "deliveryMonth invalido o faltante." })
  @ApiForbiddenResponse({ description: "No tienes permisos para consultar estos formatos." })
  @ApiNotFoundResponse({ description: "Adulto mayor no encontrado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listImportedFormatoVersions(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, adultoMayorIdParam);
    const parsedQuery = parseZodSchema(alimentacionFormatoEntregaExportQuerySchema, query);
    const versions = await this.alimentacionImportedFormatoService.listVersions(
      adultoMayorId,
      parsedQuery,
      request.currentUser,
    );

    return alimentacionImportedFormatoVersionsResponseSchema.parse({ versions });
  }

  @Get("adultos-mayores/:adultoMayorId/formato-entrega/imported-pdfs/:versionId/download")
  @ApiOkResponse({ description: "Descarga de una version importada del formato." })
  @ApiProduces("application/pdf")
  @ApiForbiddenResponse({ description: "No tienes permisos para descargar este formato." })
  @ApiNotFoundResponse({ description: "Adulto mayor o version importada no encontrada." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async downloadImportedFormatoVersion(
    @Param("adultoMayorId") adultoMayorIdParam: string,
    @Param("versionId") versionIdParam: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const adultoMayorId = parseZodSchema(adultoMayorIdParamSchema, adultoMayorIdParam);
    const versionId = parseZodSchema(importedVersionIdParamSchema, versionIdParam);
    const file = await this.alimentacionImportedFormatoService.downloadVersion(
      adultoMayorId,
      versionId,
      request.currentUser,
    );

    return sendFile(reply, file);
  }

  @Post()
  @ApiOkResponse({ description: "Lote de registros de alimentacion creado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida." })
  @ApiConflictResponse({
    description: "Ya existen registros para alguno de los adultos en la fecha.",
  })
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
  @ApiConflictResponse({
    description: "La fecha seleccionada ya tiene un registro para este adulto.",
  })
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

  @Delete(":id")
  @ApiOkResponse({ description: "Registro de alimentacion eliminado." })
  @ApiNotFoundResponse({ description: "Registro no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede eliminar el registro solicitado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async deleteRegistro(@Param("id") idParam: string, @Req() request: AuthenticatedRequest) {
    const id = parseZodSchema(recordIdParamSchema, idParam);
    await this.alimentacionService.deleteRegistro(id, request.currentUser);

    return deleteAlimentacionResponseSchema.parse({ success: true });
  }
}

function sendFile(
  reply: FastifyReply,
  file: { buffer: Buffer; contentType: string; filename: string },
  disposition: "attachment" | "inline" = "attachment",
) {
  reply.header("Content-Type", file.contentType);
  reply.header(
    "Content-Disposition",
    `${disposition}; filename="${toSafeAttachmentFilename(file.filename)}"`,
  );

  return reply.send(file.buffer);
}

async function parseImportedFormatoMultipartRequest(
  request: MultipartAuthenticatedRequest,
): Promise<BufferedAlimentacionFormatoPdfUpload> {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let upload: BufferedAlimentacionFormatoPdfUpload | null = null;

  for await (const part of request.parts()) {
    if (part.type === "field") {
      throw new BadRequestException("El formulario no admite campos adicionales.");
    }

    if (part.fieldname !== "file") {
      throw new BadRequestException("El formulario contiene un archivo no soportado.");
    }

    if (upload !== null) {
      throw new BadRequestException("Solo puedes importar un archivo PDF por solicitud.");
    }

    upload = await toBufferedImportedFormatoUpload(part);
  }

  if (upload === null) {
    throw new BadRequestException("Debes adjuntar un archivo PDF.");
  }

  return upload;
}

async function parseBulkImportedFormatoMultipartRequest(
  request: MultipartAuthenticatedRequest,
): Promise<BufferedAlimentacionFormatoPdfUpload[]> {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  const uploads: BufferedAlimentacionFormatoPdfUpload[] = [];
  for await (const part of request.parts()) {
    if (part.type === "field") {
      throw new BadRequestException("El formulario no admite campos adicionales.");
    }
    if (part.fieldname !== "files") {
      throw new BadRequestException("Los archivos deben enviarse en el campo files.");
    }
    uploads.push(await toBufferedImportedFormatoUpload(part));
  }
  return uploads;
}

async function toBufferedImportedFormatoUpload(
  part: MultipartFile,
): Promise<BufferedAlimentacionFormatoPdfUpload> {
  try {
    const buffer = await part.toBuffer();

    return {
      originalName: part.filename.trim() === "" ? "" : part.filename,
      mimeType: part.mimetype === "" ? "application/octet-stream" : part.mimetype,
      sizeBytes: buffer.byteLength,
      buffer,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "RequestFileTooLargeError") {
      throw new PayloadTooLargeException("El archivo PDF puede pesar maximo 10 MiB.");
    }

    throw error;
  }
}

function toSafeAttachmentFilename(value: string): string {
  const normalized = value.replace(/[\r\n"\\]/g, "_").trim();

  return normalized === "" ? "documento.pdf" : normalized;
}
