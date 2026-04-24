import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import {
  actividadGrupalDiligenciamientoDetailSchema,
  actividadGrupalFormOptionsResponseSchema,
  actividadGrupalIntegranteOptionsQuerySchema,
  actividadGrupalIntegranteOptionsResponseSchema,
  actividadGrupalListItemSchema,
  actividadGrupalListQuerySchema,
  actividadGrupalListResponseSchema,
  actividadGrupalTenantOptionsResponseSchema,
  createActividadGrupalRequestSchema,
  saveActividadGrupalDiligenciamientoSchema,
} from "@cuidarte/contracts";
import { type FastifyReply } from "fastify";
import { type Multipart, type MultipartFile } from "@fastify/multipart";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { type BufferedActividadGrupalUpload } from "../domain/actividad-grupal.types";
import { ActividadesGrupalesActaExportService } from "../application/actividades-grupales-acta-export.service";
import { ActividadesGrupalesService } from "../application/actividades-grupales.service";

const actividadIdParamSchema = z.uuid();
const fileIdParamSchema = z.uuid();

type MultipartAuthenticatedRequest = AuthenticatedRequest & {
  isMultipart: () => boolean;
  parts: () => AsyncIterableIterator<Multipart>;
};

@ApiTags("actividades-grupales")
@Controller("actividades-grupales")
@UseGuards(SessionGuard)
export class ActividadesGrupalesController {
  constructor(
    private readonly actividadesGrupalesService: ActividadesGrupalesService,
    private readonly actividadesGrupalesActaExportService: ActividadesGrupalesActaExportService,
  ) {}

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

  @Get(":id/diligenciamiento")
  @ApiOkResponse({ description: "Detalle editable de diligenciamiento para la sesion." })
  @ApiNotFoundResponse({ description: "Sesion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede diligenciar la sesion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getActividadGrupalDiligenciamiento(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const activityId = parseZodSchema(actividadIdParamSchema, id);
    const detail = await this.actividadesGrupalesService.getActividadGrupalDiligenciamiento(
      activityId,
      request.currentUser,
    );

    return actividadGrupalDiligenciamientoDetailSchema.parse(detail);
  }

  @Get(":id/acta/pdf")
  @ApiOkResponse({ description: "PDF del acta de la sesion grupal." })
  @ApiNotFoundResponse({ description: "Sesion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede acceder al acta." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async exportActividadGrupalActaPdf(
    @Param("id") id: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const activityId = parseZodSchema(actividadIdParamSchema, id);
    const file = await this.actividadesGrupalesActaExportService.exportPdf(
      activityId,
      request.currentUser,
    );

    return sendFile(reply, file, "inline");
  }

  @Get(":id/diligenciamiento/integrantes-options")
  @ApiOkResponse({ description: "Opciones de adultos mayores para agregar como integrantes." })
  @ApiNotFoundResponse({ description: "Sesion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede diligenciar la sesion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async searchIntegranteOptions(
    @Param("id") id: string,
    @Query() query: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const activityId = parseZodSchema(actividadIdParamSchema, id);
    const parsedQuery = parseZodSchema(actividadGrupalIntegranteOptionsQuerySchema, query);
    const integrantes = await this.actividadesGrupalesService.searchIntegranteOptions(
      activityId,
      parsedQuery,
      request.currentUser,
    );

    return actividadGrupalIntegranteOptionsResponseSchema.parse({ integrantes });
  }

  @Put(":id/diligenciamiento")
  @ApiOkResponse({ description: "Diligenciamiento guardado o actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida o archivos no permitidos." })
  @ApiNotFoundResponse({ description: "Sesion no encontrada." })
  @ApiForbiddenResponse({ description: "El usuario no puede diligenciar la sesion." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async saveActividadGrupalDiligenciamiento(
    @Param("id") id: string,
    @Req() request: MultipartAuthenticatedRequest,
  ) {
    const activityId = parseZodSchema(actividadIdParamSchema, id);
    const multipartPayload = await parseDiligenciamientoMultipartRequest(request);
    const payload = parseZodSchema(
      saveActividadGrupalDiligenciamientoSchema,
      multipartPayload.body,
    );
    const detail = await this.actividadesGrupalesService.saveActividadGrupalDiligenciamiento(
      {
        activityId,
        payload,
        newPhotos: multipartPayload.newPhotos,
        newPdf: multipartPayload.newPdf,
      },
      request.currentUser,
    );

    return actividadGrupalDiligenciamientoDetailSchema.parse(detail);
  }

  @Get(":id/diligenciamiento/files/:fileId")
  @ApiOkResponse({ description: "Descarga o visualizacion de archivos del diligenciamiento." })
  @ApiNotFoundResponse({ description: "Sesion o archivo no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no puede acceder al archivo." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async downloadSupportFile(
    @Param("id") id: string,
    @Param("fileId") fileIdParam: string,
    @Req() request: AuthenticatedRequest,
    @Res() reply: FastifyReply,
  ) {
    const activityId = parseZodSchema(actividadIdParamSchema, id);
    const fileId = parseZodSchema(fileIdParamSchema, fileIdParam);
    const file = await this.actividadesGrupalesService.downloadSupportFile(
      activityId,
      fileId,
      request.currentUser,
    );

    return sendFile(reply, file, file.disposition);
  }
}

function sendFile(
  reply: FastifyReply,
  file: { buffer: Buffer; contentType: string; filename: string },
  disposition: "attachment" | "inline",
) {
  reply.header("Content-Type", file.contentType);
  reply.header("Content-Disposition", `${disposition}; filename="${file.filename}"`);

  return reply.send(file.buffer);
}

async function parseDiligenciamientoMultipartRequest(request: MultipartAuthenticatedRequest) {
  if (!request.isMultipart()) {
    throw new BadRequestException("La solicitud debe enviarse como multipart/form-data.");
  }

  let body: unknown = null;
  let newPdf: BufferedActividadGrupalUpload | null = null;
  const newPhotos: BufferedActividadGrupalUpload[] = [];

  for await (const part of request.parts()) {
    if (part.type === "field") {
      if (part.fieldname !== "payload") {
        throw new BadRequestException("El formulario contiene un campo no soportado.");
      }

      if (body !== null) {
        throw new BadRequestException("El payload del formulario no puede repetirse.");
      }

      body = parseMultipartPayloadValue(part.value);
      continue;
    }

    if (part.fieldname === "photos") {
      newPhotos.push(await toBufferedUpload(part));
      continue;
    }

    if (part.fieldname === "pdf") {
      if (newPdf !== null) {
        throw new BadRequestException("Solo puedes adjuntar un documento PDF.");
      }

      newPdf = await toBufferedUpload(part);
      continue;
    }

    throw new BadRequestException("El formulario contiene un archivo no soportado.");
  }

  if (body === null) {
    throw new BadRequestException("No se recibio el payload del diligenciamiento.");
  }

  return {
    body,
    newPhotos,
    newPdf,
  };
}

function parseMultipartPayloadValue(value: unknown): unknown {
  if (typeof value !== "string") {
    throw new BadRequestException("El payload del diligenciamiento es invalido.");
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    throw new BadRequestException("El payload del diligenciamiento no tiene un JSON valido.");
  }
}

async function toBufferedUpload(part: MultipartFile): Promise<BufferedActividadGrupalUpload> {
  const buffer = await part.toBuffer();

  return {
    originalName: part.filename.trim() === "" ? "archivo" : part.filename,
    mimeType: part.mimetype,
    sizeBytes: buffer.byteLength,
    buffer,
  };
}
