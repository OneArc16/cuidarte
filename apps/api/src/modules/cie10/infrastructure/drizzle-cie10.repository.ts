import { Injectable } from "@nestjs/common";
import { and, asc, eq, ilike, or } from "drizzle-orm";

import { DatabaseService } from "../../../database/database.service";
import { cie10Catalog } from "../../../database/schema";
import { type Cie10Repository } from "../domain/cie10.repository";
import { type Cie10OptionRecord, type Cie10SearchOptionsQuery } from "../domain/cie10.types";

@Injectable()
export class DrizzleCie10Repository implements Cie10Repository {
  constructor(private readonly database: DatabaseService) {}

  async searchOptions(query: Cie10SearchOptionsQuery): Promise<Cie10OptionRecord[]> {
    const normalizedSearch = normalizeText(query.search);
    const searchPattern = `%${escapeLikePattern(normalizedSearch)}%`;
    const codePrefixPattern = `${escapeLikePattern(query.search).toUpperCase()}%`;

    return await this.database.db
      .select({
        code: cie10Catalog.code,
        title: cie10Catalog.title,
      })
      .from(cie10Catalog)
      .where(
        and(
          eq(cie10Catalog.isActive, true),
          or(
            ilike(cie10Catalog.code, codePrefixPattern),
            ilike(cie10Catalog.titleNormalized, searchPattern),
            ilike(cie10Catalog.title, searchPattern),
          )!,
        ),
      )
      .orderBy(asc(cie10Catalog.code))
      .limit(query.limit);
  }
}

function escapeLikePattern(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("%", "\\%").replaceAll("_", "\\_");
}

function normalizeText(value: string): string {
  return value
    .normalize("NFD")
    .replaceAll(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}
