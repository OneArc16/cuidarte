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
import { ApiConflictResponse, ApiForbiddenResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import {
  backofficeTenantDetailResponseSchema,
  backofficeTenantListQuerySchema,
  backofficeTenantListResponseSchema,
  createBackofficeTenantRequestSchema,
  updateBackofficeTenantRequestSchema,
} from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../auth/authenticated-request";
import { RequireRoles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { SessionGuard } from "../auth/session.guard";
import { EmpleadosSignatureService } from "../empleados/application/empleados-signature.service";
import { toTenantActiveSignerResponse } from "../empleados/presentation/tenant-active-signer.presenter";
import { BackofficeService } from "./backoffice.service";
import { TenantBrandingService } from "../tenant-branding/application/tenant-branding.service";

const tenantIdParamSchema = z.uuid();

@ApiTags("backoffice")
@Controller("backoffice")
@UseGuards(SessionGuard, RolesGuard)
@RequireRoles("super_admin")
export class BackofficeController {
  constructor(
    private readonly backofficeService: BackofficeService,
    private readonly tenantBrandingService: TenantBrandingService,
    private readonly empleadosSignatureService: EmpleadosSignatureService,
  ) {}

  @Get("tenants")
  @ApiOkResponse({ description: "Listado de tenants para BackOffice." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  async listTenants(@Query() query: unknown) {
    const parsedQuery = parseZodSchema(backofficeTenantListQuerySchema, query);
    const tenants = await this.backofficeService.listTenants(parsedQuery);

    return backofficeTenantListResponseSchema.parse({ tenants });
  }

  @Get("tenants/:id")
  @ApiOkResponse({ description: "Detalle de tenant y propietario." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  async getTenant(@Param("id") id: string, @Req() request: AuthenticatedRequest) {
    const tenantId = parseZodSchema(tenantIdParamSchema, id);
    const [detail, logo, activeSigner] = await Promise.all([
      this.backofficeService.getTenantDetail(tenantId),
      this.tenantBrandingService.getAdministrativeLogo(tenantId, request.currentUser),
      this.empleadosSignatureService.findTenantActiveSignerByTenantId(tenantId),
    ]);

    return backofficeTenantDetailResponseSchema.parse({
      ...detail,
      logo,
      activeSigner: toTenantActiveSignerResponse(activeSigner),
    });
  }

  @Post("tenants")
  @ApiOkResponse({ description: "Tenant y propietario creados." })
  @ApiConflictResponse({ description: "Documento, correo o propietario duplicado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  async createTenant(@Body() body: unknown, @Req() request: AuthenticatedRequest) {
    const command = parseZodSchema(createBackofficeTenantRequestSchema, body);
    const detail = await this.backofficeService.createTenant(command, request.currentUser);

    return backofficeTenantDetailResponseSchema.parse({
      ...detail,
      activeSigner: null,
      logo: null,
    });
  }

  @Patch("tenants/:id")
  @ApiOkResponse({ description: "Tenant y propietario actualizados." })
  @ApiConflictResponse({ description: "Documento, correo o propietario duplicado." })
  @ApiForbiddenResponse({ description: "El usuario no tiene rol SuperAdmin." })
  async updateTenant(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() request: AuthenticatedRequest,
  ) {
    const tenantId = parseZodSchema(tenantIdParamSchema, id);
    const command = parseZodSchema(updateBackofficeTenantRequestSchema, body);
    const detail = await this.backofficeService.updateTenant(tenantId, command, request.currentUser);
    const [logo, activeSigner] = await Promise.all([
      this.tenantBrandingService.getAdministrativeLogo(tenantId, request.currentUser),
      this.empleadosSignatureService.findTenantActiveSignerByTenantId(tenantId),
    ]);

    return backofficeTenantDetailResponseSchema.parse({
      ...detail,
      logo,
      activeSigner: toTenantActiveSignerResponse(activeSigner),
    });
  }
}
