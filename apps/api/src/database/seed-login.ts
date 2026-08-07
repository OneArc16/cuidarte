import { hash } from "argon2";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { getEnv } from "../config/env";
import { adultosMayores, tenants, users } from "./schema";

const seedPassword = process.env.SEED_PASSWORD ?? "Cuidarte123!";
const demoTenantName = "Centro de Vida Demo";
const demoTenantEmail = "contacto@centro-demo.test";

export async function seedLogin(): Promise<void> {
  const env = getEnv();
  const client = postgres(env.DATABASE_URL, {
    max: 1,
    prepare: false,
  });
  const db = drizzle(client);

  try {
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
        isTenantOwner: false,
        passwordHash,
        passwordSetByAdmin: true,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          fullName: "SuperAdmin Cuidarte",
          role: "super_admin",
          isTenantOwner: false,
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
        role: "admin",
        isTenantOwner: true,
        passwordHash,
        passwordSetByAdmin: true,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          tenantId: tenant.id,
          fullName: "Admin Centro Demo",
          role: "admin",
          isTenantOwner: true,
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
        email: "auditor@centro-demo.test",
        fullName: "Auditor Centro Demo",
        role: "auditor",
        isTenantOwner: false,
        passwordHash,
        passwordSetByAdmin: true,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: users.email,
        set: {
          tenantId: tenant.id,
          fullName: "Auditor Centro Demo",
          role: "auditor",
          isTenantOwner: false,
          passwordHash,
          passwordSetByAdmin: true,
          isActive: true,
          updatedAt: new Date(),
        },
      });

    const demoAdultosMayores = [
      {
        documentType: "cc" as const,
        documentNumber: "1020304050",
        names: "Rosa Elena",
        surnames: "Martinez Rojas",
        firstName: "Rosa",
        middleName: "Elena",
        firstSurname: "Martinez",
        secondSurname: "Rojas",
        phone: "3105550101",
        phoneSecondary: null,
        email: "rosa.martinez@example.test",
        birthDate: "1948-03-12",
        sex: "female" as const,
        educationLevel: "Primaria",
        disability: null,
        populationGroup: "Persona mayor",
        address: "Calle 45 # 18-20",
        department: "Cundinamarca",
        municipality: "Bogota",
        zone: "urban",
        country: "Colombia",
        emergencyContactFullName: "Mariana Rojas",
        emergencyContactRelationship: "Hija",
        emergencyContactPhone: "3105552211",
        emergencyContactAddress: "Calle 45 # 18-20",
        bloodType: "o_positive",
        sisben: "B2",
        healthRegime: "subsidized",
        eps: "Salud Demo",
        livesWithSomeone: true,
        companion: "Mariana Rojas",
        economicIncome: 450000,
        socialProgramBeneficiary: true,
      },
      {
        documentType: "cc" as const,
        documentNumber: "71234567",
        names: "Alfonso",
        surnames: "Gomez Prieto",
        firstName: "Alfonso",
        middleName: null,
        firstSurname: "Gomez",
        secondSurname: "Prieto",
        phone: "3155550199",
        phoneSecondary: null,
        email: null,
        birthDate: "1942-09-28",
        sex: "male" as const,
        educationLevel: "Secundaria",
        disability: null,
        populationGroup: "Persona mayor",
        address: "Carrera 8 # 12-40",
        department: "Cundinamarca",
        municipality: "Bogota",
        zone: "urban",
        country: "Colombia",
        emergencyContactFullName: "Laura Gomez",
        emergencyContactRelationship: "Nieta",
        emergencyContactPhone: "3155552020",
        emergencyContactAddress: "Carrera 8 # 12-40",
        bloodType: "a_positive",
        sisben: "C1",
        healthRegime: "contributory",
        eps: "EPS Demo",
        livesWithSomeone: false,
        companion: null,
        economicIncome: 700000,
        socialProgramBeneficiary: false,
      },
      {
        documentType: "ce" as const,
        documentNumber: "CE908070",
        names: "Carmen Lucia",
        surnames: "Herrera Solano",
        firstName: "Carmen",
        middleName: "Lucia",
        firstSurname: "Herrera",
        secondSurname: "Solano",
        phone: null,
        phoneSecondary: null,
        email: null,
        birthDate: "1951-06-04",
        sex: "female" as const,
        educationLevel: null,
        disability: null,
        populationGroup: "Persona mayor",
        address: "Vereda El Jardin",
        department: "Cundinamarca",
        municipality: "Soacha",
        zone: "rural",
        country: "Colombia",
        emergencyContactFullName: null,
        emergencyContactRelationship: null,
        emergencyContactPhone: null,
        emergencyContactAddress: null,
        bloodType: "unknown",
        sisben: null,
        healthRegime: "unknown",
        eps: null,
        livesWithSomeone: true,
        companion: "Vecina cuidadora",
        economicIncome: null,
        socialProgramBeneficiary: true,
      },
    ];

    for (const adultoMayor of demoAdultosMayores) {
      await db
        .insert(adultosMayores)
        .values({
          tenantId: tenant.id,
          ...adultoMayor,
        })
        .onConflictDoUpdate({
          target: [
            adultosMayores.tenantId,
            adultosMayores.documentType,
            adultosMayores.documentNumber,
          ],
          set: {
            names: adultoMayor.names,
            surnames: adultoMayor.surnames,
            firstName: adultoMayor.firstName,
            middleName: adultoMayor.middleName,
            firstSurname: adultoMayor.firstSurname,
            secondSurname: adultoMayor.secondSurname,
            educationLevel: adultoMayor.educationLevel,
            disability: adultoMayor.disability,
            populationGroup: adultoMayor.populationGroup,
            address: adultoMayor.address,
            department: adultoMayor.department,
            municipality: adultoMayor.municipality,
            zone: adultoMayor.zone,
            country: adultoMayor.country,
            phone: adultoMayor.phone,
            phoneSecondary: adultoMayor.phoneSecondary,
            email: adultoMayor.email,
            emergencyContactFullName: adultoMayor.emergencyContactFullName,
            emergencyContactRelationship: adultoMayor.emergencyContactRelationship,
            emergencyContactPhone: adultoMayor.emergencyContactPhone,
            emergencyContactAddress: adultoMayor.emergencyContactAddress,
            bloodType: adultoMayor.bloodType,
            sisben: adultoMayor.sisben,
            healthRegime: adultoMayor.healthRegime,
            eps: adultoMayor.eps,
            livesWithSomeone: adultoMayor.livesWithSomeone,
            companion: adultoMayor.companion,
            economicIncome: adultoMayor.economicIncome,
            socialProgramBeneficiary: adultoMayor.socialProgramBeneficiary,
            birthDate: adultoMayor.birthDate,
            sex: adultoMayor.sex,
            updatedAt: new Date(),
          },
        });
    }

    console.log("Seed de login completado.");
    console.log("superadmin@cuidarte.test /", seedPassword);
    console.log("admin@centro-demo.test /", seedPassword);
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (require.main === module) {
  void seedLogin().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
