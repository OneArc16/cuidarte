import {
  departmentsResponseSchema,
  municipalitiesResponseSchema,
  type DepartmentsResponse,
  type MunicipalitiesResponse,
} from "@cuidarte/contracts";
import { BadRequestException, Inject, Injectable, NotFoundException } from "@nestjs/common";

import {
  UBICACIONES_REPOSITORY,
  type UbicacionesRepository,
} from "../domain/ubicaciones.repository";
import { type DepartmentMunicipalityPair } from "../domain/ubicaciones.types";

@Injectable()
export class UbicacionesService {
  constructor(
    @Inject(UBICACIONES_REPOSITORY)
    private readonly ubicacionesRepository: UbicacionesRepository,
  ) {}

  async listDepartments(): Promise<DepartmentsResponse["departments"]> {
    const departments = await this.ubicacionesRepository.findActiveDepartments();

    return departmentsResponseSchema.parse({ departments }).departments;
  }

  async listMunicipalitiesByDepartment(
    departmentId: string,
  ): Promise<MunicipalitiesResponse["municipalities"]> {
    const department = await this.ubicacionesRepository.findDepartmentById(departmentId);

    if (department === null) {
      throw new NotFoundException("Departamento no encontrado.");
    }

    const municipalities = await this.ubicacionesRepository.findActiveMunicipalitiesByDepartmentId(
      departmentId,
    );

    return municipalitiesResponseSchema.parse({ municipalities }).municipalities;
  }

  async resolveDepartmentMunicipalityPair(
    departmentId: string,
    municipalityId: string,
  ): Promise<DepartmentMunicipalityPair> {
    const pair = await this.ubicacionesRepository.findDepartmentMunicipalityPair(
      departmentId,
      municipalityId,
    );

    if (pair === null) {
      const municipality = await this.ubicacionesRepository.findMunicipalityById(municipalityId);

      if (municipality === null) {
        throw new NotFoundException("Municipio no encontrado.");
      }

      throw new BadRequestException("El municipio no pertenece al departamento seleccionado.");
    }

    return pair;
  }
}
