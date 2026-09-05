import { Controller, Get, Param, Req, UseGuards } from "@nestjs/common";
import { ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { departmentsResponseSchema, municipalitiesResponseSchema } from "@cuidarte/contracts";
import { z } from "zod";

import { parseZodSchema } from "../../../common/parse-zod-schema";
import { type AuthenticatedRequest } from "../../auth/authenticated-request";
import { SessionGuard } from "../../auth/session.guard";
import { UbicacionesService } from "../application/ubicaciones.service";

const departmentIdParamSchema = z.uuid();

@ApiTags("ubicaciones")
@Controller("ubicaciones")
@UseGuards(SessionGuard)
export class UbicacionesController {
  constructor(private readonly ubicacionesService: UbicacionesService) {}

  @Get("departments")
  @ApiOkResponse({ description: "Listado de departamentos activos." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listDepartments(@Req() _request: AuthenticatedRequest) {
    const departments = await this.ubicacionesService.listDepartments();

    return departmentsResponseSchema.parse({ departments });
  }

  @Get("departments/:departmentId/municipalities")
  @ApiOkResponse({ description: "Listado de municipios activos por departamento." })
  @ApiUnauthorizedResponse({ description: "Sesion requerida." })
  async listMunicipalities(@Param("departmentId") departmentId: string, @Req() _request: AuthenticatedRequest) {
    const parsedDepartmentId = parseZodSchema(departmentIdParamSchema, departmentId);
    const municipalities = await this.ubicacionesService.listMunicipalitiesByDepartment(
      parsedDepartmentId,
    );

    return municipalitiesResponseSchema.parse({ municipalities });
  }
}
