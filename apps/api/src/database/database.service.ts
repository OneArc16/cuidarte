import { Injectable, type OnModuleDestroy } from "@nestjs/common";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import * as schema from "./schema";

export type AppDatabase = PostgresJsDatabase<typeof schema>;

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly client = postgres(getEnv().DATABASE_URL, {
    max: 10,
    prepare: false,
  });

  readonly db: AppDatabase = drizzle(this.client, { schema });

  async onModuleDestroy(): Promise<void> {
    await this.client.end({ timeout: 5 });
  }
}
