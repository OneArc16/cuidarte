import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { employeeTeams } from "../../../database/schema";
import { type CreateEquipoCommand, type EquipoRecord, type UpdateEquipoCommand } from "../domain/equipo.types";
import { type EquiposRepository } from "../domain/equipos.repository";

@Injectable()
export class DrizzleEquiposRepository implements EquiposRepository {
  constructor(private readonly database: DatabaseService) {}

  async findMany(): Promise<EquipoRecord[]> {
    return await this.database.db
      .select()
      .from(employeeTeams)
      .orderBy(asc(employeeTeams.name));
  }

  async findById(id: string): Promise<EquipoRecord | null> {
    const [team] = await this.database.db
      .select()
      .from(employeeTeams)
      .where(eq(employeeTeams.id, id))
      .limit(1);

    return team ?? null;
  }

  async findByNormalizedName(normalizedName: string): Promise<EquipoRecord | null> {
    const [team] = await this.database.db
      .select()
      .from(employeeTeams)
      .where(eq(employeeTeams.normalizedName, normalizedName))
      .limit(1);

    return team ?? null;
  }

  async create(command: CreateEquipoCommand): Promise<EquipoRecord> {
    const [team] = await this.database.db
      .insert(employeeTeams)
      .values({ ...command, createdAt: new Date(), updatedAt: new Date() })
      .returning();

    if (team === undefined) throw new Error("No fue posible crear el equipo.");
    return team;
  }

  async update(command: UpdateEquipoCommand): Promise<EquipoRecord> {
    const { id, name, normalizedName, isVisible } = command;
    const [team] = await this.database.db
      .update(employeeTeams)
      .set({
        ...(name === undefined ? {} : { name }),
        ...(normalizedName === undefined ? {} : { normalizedName }),
        ...(isVisible === undefined ? {} : { isVisible }),
        updatedAt: new Date(),
      })
      .where(eq(employeeTeams.id, id))
      .returning();

    if (team === undefined) throw new Error("No fue posible actualizar el equipo.");
    return team;
  }
}
