import { Injectable } from "@nestjs/common";
import { asc, eq } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { epsCatalog } from "../../../database/schema";
import { type EpsRepository } from "../domain/eps.repository";
import { type EpsRecord } from "../domain/eps.types";

@Injectable()
export class DrizzleEpsRepository implements EpsRepository {
  constructor(private readonly database: DatabaseService) {}

  async findActive(): Promise<EpsRecord[]> {
    return await this.database.db
      .select({
        id: epsCatalog.id,
        code: epsCatalog.code,
        name: epsCatalog.name,
        isActive: epsCatalog.isActive,
      })
      .from(epsCatalog)
      .where(eq(epsCatalog.isActive, true))
      .orderBy(asc(epsCatalog.name));
  }

  async findById(id: string): Promise<EpsRecord | null> {
    const [record] = await this.database.db
      .select({
        id: epsCatalog.id,
        code: epsCatalog.code,
        name: epsCatalog.name,
        isActive: epsCatalog.isActive,
      })
      .from(epsCatalog)
      .where(eq(epsCatalog.id, id))
      .limit(1);

    return record ?? null;
  }
}
