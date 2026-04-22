import { hash } from "argon2";
import { eq } from "drizzle-orm";
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
const demoTenantName = "Centro de Vida Demo";
const demoTenantEmail = "contacto@centro-demo.test";

async function seed(): Promise<void> {
  const passwordHash = await hash(seedPassword);
  const [existingTenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.name, demoTenantName))
    .limit(1);

  const [tenant] =
    existingTenant === undefined
      ? await db
          .insert(tenants)
          .values({
            name: demoTenantName,
            documentType: "nit",
            documentNumber: "900123456",
            email: demoTenantEmail,
            phone: "6015550101",
            address: "Calle 10 # 20-30",
            city: "Bogota",
            department: "Cundinamarca",
            isActive: true,
          })
          .returning()
      : await db
          .update(tenants)
          .set({
            name: demoTenantName,
            documentType: "nit",
            documentNumber: "900123456",
            email: demoTenantEmail,
            phone: "6015550101",
            address: "Calle 10 # 20-30",
            city: "Bogota",
            department: "Cundinamarca",
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(tenants.id, existingTenant.id))
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
