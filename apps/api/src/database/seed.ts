import { hash } from "argon2";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { tenants, users } from "./schema";

const env = getEnv();
const client = postgres(env.DATABASE_URL, {
  max: 1,
  prepare: false,
});
const db = drizzle(client);

const seedPassword = process.env.SEED_PASSWORD ?? "Cuidarte123!";

async function seed(): Promise<void> {
  const passwordHash = await hash(seedPassword);

  const [tenant] = await db
    .insert(tenants)
    .values({
      name: "Centro de Vida Demo",
      slug: "centro-demo",
      isActive: true,
    })
    .onConflictDoUpdate({
      target: tenants.slug,
      set: {
        name: "Centro de Vida Demo",
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning();

  if (tenant === undefined) {
    throw new Error("No fue posible crear el tenant demo.");
  }

  await db
    .insert(users)
    .values({
      tenantId: null,
      email: "superadmin@cuidarte.test",
      fullName: "SuperAdmin Cuidarte",
      role: "super_admin",
      passwordHash,
      passwordSetByAdmin: true,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        fullName: "SuperAdmin Cuidarte",
        role: "super_admin",
        passwordHash,
        passwordSetByAdmin: true,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  await db
    .insert(users)
    .values({
      tenantId: tenant.id,
      email: "admin@centro-demo.test",
      fullName: "Admin Centro Demo",
      role: "tenant_admin",
      passwordHash,
      passwordSetByAdmin: true,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        tenantId: tenant.id,
        fullName: "Admin Centro Demo",
        role: "tenant_admin",
        passwordHash,
        passwordSetByAdmin: true,
        isActive: true,
        updatedAt: new Date(),
      },
    });
}

seed()
  .then(async () => {
    await client.end({ timeout: 5 });
    console.log("Seed completado.");
    console.log("superadmin@cuidarte.test /", seedPassword);
    console.log("admin@centro-demo.test /", seedPassword);
  })
  .catch(async (error: unknown) => {
    await client.end({ timeout: 5 });
    console.error(error);
    process.exitCode = 1;
  });
