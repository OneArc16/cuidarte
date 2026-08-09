import { Injectable } from "@nestjs/common";
import { and, asc, eq } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { departments, municipalities } from "../../../database/schema";
import {
  type DepartmentRecord,
  type DepartmentMunicipalityPair,
  type MunicipalityRecord,
} from "../domain/ubicaciones.types";
import { type UbicacionesRepository } from "../domain/ubicaciones.repository";

@Injectable()
export class DrizzleUbicacionesRepository implements UbicacionesRepository {
  constructor(private readonly database: DatabaseService) {}

  async findActiveDepartments(): Promise<DepartmentRecord[]> {
    return await this.database.db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .where(eq(departments.isActive, true))
      .orderBy(asc(departments.name));
  }

  async findActiveMunicipalitiesByDepartmentId(
    departmentId: string,
  ): Promise<MunicipalityRecord[]> {
    return await this.database.db
      .select({
        id: municipalities.id,
        departmentId: municipalities.departmentId,
        name: municipalities.name,
      })
      .from(municipalities)
      .where(and(eq(municipalities.isActive, true), eq(municipalities.departmentId, departmentId)))
      .orderBy(asc(municipalities.name));
  }

  async findDepartmentById(departmentId: string): Promise<DepartmentRecord | null> {
    const [department] = await this.database.db
      .select({
        id: departments.id,
        name: departments.name,
      })
      .from(departments)
      .where(and(eq(departments.id, departmentId), eq(departments.isActive, true)))
      .limit(1);

    return department ?? null;
  }

  async findMunicipalityById(municipalityId: string): Promise<MunicipalityRecord | null> {
    const [municipality] = await this.database.db
      .select({
        id: municipalities.id,
        departmentId: municipalities.departmentId,
        name: municipalities.name,
      })
      .from(municipalities)
      .where(and(eq(municipalities.id, municipalityId), eq(municipalities.isActive, true)))
      .limit(1);

    return municipality ?? null;
  }

  async findDepartmentMunicipalityPair(
    departmentId: string,
    municipalityId: string,
  ): Promise<DepartmentMunicipalityPair | null> {
    const [row] = await this.database.db
      .select({
        departmentId: departments.id,
        departmentName: departments.name,
        municipalityId: municipalities.id,
        municipalityDepartmentId: municipalities.departmentId,
        municipalityName: municipalities.name,
      })
      .from(departments)
      .innerJoin(municipalities, eq(municipalities.departmentId, departments.id))
      .where(
        and(
          eq(departments.id, departmentId),
          eq(departments.isActive, true),
          eq(municipalities.id, municipalityId),
          eq(municipalities.isActive, true),
        ),
      )
      .limit(1);

    if (row === undefined) {
      return null;
    }

    return {
      department: {
        id: row.departmentId,
        name: row.departmentName,
      },
      municipality: {
        id: row.municipalityId,
        departmentId: row.municipalityDepartmentId,
        name: row.municipalityName,
      },
    };
  }
}
