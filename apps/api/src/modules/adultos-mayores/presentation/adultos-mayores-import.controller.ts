import {
  BadRequestException,
  Controller,
  Get,
  Param,
  PayloadTooLargeException,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiConsumes,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  adultoMayorImportConfirmResponseSchema,
  adultoMayorImportDetailSchema,
  adultoMayorImportValidateQuerySchema,
} from "@cuidarte/contracts";
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import { type FastifyReply } from "fastify";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { RequireRoles } from "../../auth/roles.decorator";
import { RolesGuard } from "../../auth/roles.guard";
import { SessionGuard } from "../../auth/session.guard";
import { AdultosMayoresImportService, type BufferedAdultoMayorImportUpload } from "../application/adultos-mayores-import.service";

const importIdParamSchema = z.uuid();

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@ApiTags("adultos-mayores-import")
@Controller("adultos-mayores/imports")
@UseGuards(SessionGuard, RolesGuard)
@RequireRoles("super_admin", "admin")
export class AdultosMayoresImportController {
  constructor(private readonly importService: AdultosMayoresImportService) {}

  @Get("template")
  @ApiOkResponse({ description: "Plantilla Excel versionada." })
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "No tienes permisos para importar adultos mayores." })
  async downloadTemplate(@Req() request: AuthenticatedRequest, @Res() reply: FastifyReply) {
    const file = await this.importService.downloadTemplate(request.currentUser);

    return sendFile(reply, file.buffer, file.contentType, file.filename);
  }

  @Post("validate")
  @ApiOkResponse({ description: "Lote validado." })
  @ApiConsumes("multipart/form-data")
  @ApiBadRequestResponse({ description: "Solicitud invalida o plantilla no soportada." })
  @ApiForbiddenResponse({ description: "No tienes permisos o el centro no es valido." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async validateImport(
    @Query() query: unknown,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const parsedQuery = adultoMayorImportValidateQuerySchema.parse(query);
    const upload = await parseImportMultipartRequest(request);
    const response = await this.importService.validateImport(
      upload,
      request.currentUser,
      parsedQuery.tenantId,
    );

    return adultoMayorImportDetailSchema.parse(response);
  }

  @Get(":importId")
  @ApiOkResponse({ description: "Detalle del lote de importacion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "No tienes permisos para consultar este lote." })
  async getImport(@Param("importId") importIdParam: string, @Req() request: AuthenticatedRequest) {
    const importId = parseZodSchema(importIdParamSchema, importIdParam);
    const response = await this.importService.getImport(importId, request.currentUser);

    return adultoMayorImportDetailSchema.parse(response);
  }

  @Post(":importId/confirm")
  @ApiOkResponse({ description: "Lote confirmado." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "No tienes permisos para confirmar este lote." })
  async confirmImport(
    @Param("importId") importIdParam: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const importId = parseZodSchema(importIdParamSchema, importIdParam);
    const response = await this.importService.confirmImport(importId, request.currentUser);

    return adultoMayorImportConfirmResponseSchema.parse(response);
  }

  @Get(":importId/errors.xlsx")
  @ApiOkResponse({ description: "Reporte completo de errores." })
  @ApiProduces("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  @ApiForbiddenResponse({ description: "No tienes permisos para descargar este reporte." })
  async downloadErrors(
    @Param("importId") importIdParam: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const importId = parseZodSchema(importIdParamSchema, importIdParam);
    const file = await this.importService.downloadIssuesWorkbook(importId, request.currentUser);

    return sendFile(reply, file.buffer, file.contentType, file.filename);
  }
}

async function parseImportMultipartRequest(
  request: MultipartAuthenticatedRequest,
): Promise<BufferedAdultoMayorImportUpload> {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let upload: BufferedAdultoMayorImportUpload | null = null;

  for await (const part of request.parts()) {
    if (part.type === "field") {
      throw new BadRequestException("El formulario no admite campos adicionales.");
    }

    if (part.fieldname !== "file") {
      throw new BadRequestException("El formulario contiene un archivo no soportado.");
    }

    if (upload !== null) {
      throw new BadRequestException("Solo puedes importar un archivo por solicitud.");
    }

    upload = await toBufferedUpload(part);
  }

  if (upload === null) {
    throw new BadRequestException("Debes adjuntar un archivo .xlsx.");
  }

  return upload;
}

async function toBufferedUpload(part: MultipartFile): Promise<BufferedAdultoMayorImportUpload> {
  try {
    const buffer = await part.toBuffer();

    if (buffer.byteLength === 0) {
      throw new BadRequestException("El archivo no puede estar vacio.");
    }

    if (!part.filename.toLowerCase().endsWith(".xlsx")) {
      throw new BadRequestException("El archivo debe ser una plantilla Excel .xlsx de CuidarTe.");
    }

    if (!["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "application/octet-stream"].includes(part.mimetype)) {
      throw new BadRequestException("El archivo debe ser una plantilla Excel .xlsx de CuidarTe.");
    }

    return {
      originalName: part.filename.trim(),
      mimeType: part.mimetype,
      sizeBytes: buffer.byteLength,
      buffer,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "RequestFileTooLargeError") {
      throw new PayloadTooLargeException("El archivo supera el limite de 10 MiB.");
    }

    throw error;
  }
}

function sendFile(
  reply: FastifyReply,
  buffer: Buffer,
  contentType: string,
  filename: string,
) {
  reply.header("Content-Type", contentType);
  reply.header("Content-Disposition", `attachment; filename="${sanitizeFilename(filename)}"`);
  reply.header("Cache-Control", "private, no-store");

  return reply.send(buffer);
}

function sanitizeFilename(value: string): string {
  const cleaned = value.replace(/[\r\n"\\]/g, "_").trim();
  return cleaned === "" ? "documento.xlsx" : cleaned;
}
