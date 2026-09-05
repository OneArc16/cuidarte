import { Body, Controller, Delete, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import {
  ApiBadRequestResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { z } from "zod";

import {
  setTenantActiveSignerRequestSchema,
  tenantActiveSignerResponseSchema,
} from "@cuidarte/contracts";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { EmpleadosSignatureService } from "../application/empleados-signature.service";
import { toTenantActiveSignerResponse } from "./tenant-active-signer.presenter";

const tenantIdParamSchema = z.uuid();

@ApiTags("tenants")
@Controller("tenants")
@UseGuards(SessionGuard)
export class TenantActiveSignerController {
  constructor(private readonly empleadosSignatureService: EmpleadosSignatureService) {}

  @Get(":tenantId/active-signer")
  @ApiOkResponse({ description: "Firmante activo del centro." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para gestionar empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async getActiveSigner(
    @Param("tenantId") tenantIdValue: string,
    @Req() _request: AuthenticatedRequest,
  ) {
    const tenantId = parseZodSchema(tenantIdParamSchema, tenantIdValue);
    const activeSigner = await this.empleadosSignatureService.findTenantActiveSignerByTenantId(
      tenantId,
    );

    return tenantActiveSignerResponseSchema.parse({
      activeSigner: toTenantActiveSignerResponse(activeSigner),
    });
  }

  @Put(":tenantId/active-signer")
  @ApiOkResponse({ description: "Firmante activo del centro actualizado." })
  @ApiBadRequestResponse({ description: "Solicitud invalida o firma no compatible." })
  @ApiNotFoundResponse({ description: "Usuario o centro no encontrado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para gestionar empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async setActiveSigner(
    @Param("tenantId") tenantIdValue: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const tenantId = parseZodSchema(tenantIdParamSchema, tenantIdValue);
    const command = parseZodSchema(setTenantActiveSignerRequestSchema, body);
    const activeSigner = await this.empleadosSignatureService.setTenantActiveSigner(
      tenantId,
      command,
      request.currentUser,
    );

    return tenantActiveSignerResponseSchema.parse({
      activeSigner: toTenantActiveSignerResponse(activeSigner),
    });
  }

  @Delete(":tenantId/active-signer")
  @ApiOkResponse({ description: "Firmante activo del centro desactivado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene permisos para gestionar empleados." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async clearActiveSigner(
    @Param("tenantId") tenantIdValue: string,
    @Req() request: AuthenticatedRequest,
  ) {
    const tenantId = parseZodSchema(tenantIdParamSchema, tenantIdValue);
    const activeSigner = await this.empleadosSignatureService.clearTenantActiveSigner(
      tenantId,
      request.currentUser,
    );

    return tenantActiveSignerResponseSchema.parse({
      activeSigner: toTenantActiveSignerResponse(activeSigner),
    });
  }
}
