const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function requireEnv(names, label) {
  for (const name of names) {
    const val = process.env[name];
    if (val && val.trim().length > 0) {
      return val.trim();
    }
  }
  throw new Error(`[Seed Error] Missing required environment variable for ${label}. Please define one of: ${names.join(", ")}`);
}

async function main() {
  console.log("[Seed] Reading seed account configuration from environment variables...");

  const adminEmail = requireEnv(["ADMIN_EMAIL", "SEED_ADMIN_EMAIL"], "Admin Email").toLowerCase().trim();
  const adminPassword = requireEnv(["ADMIN_PASSWORD", "SEED_ADMIN_PASSWORD"], "Admin Password");

  const existing = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        name: "IDEAPAD Admin",
        role: "ADMIN",
        approvalStatus: "APPROVED",
        designation: "Director IDEAPAD",
        department: "Innovation & Incubation",
        active: true,
        passwordHash,
        mustChangePassword: true,
      },
    });
    console.log(`[Seed] Created ADMIN: ${adminEmail}`);
  } else {
    const passwordMatches = await bcrypt.compare(adminPassword, existing.passwordHash);
    if (!passwordMatches) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          name: "IDEAPAD Admin",
          role: "ADMIN",
          approvalStatus: "APPROVED",
          designation: "Director IDEAPAD",
          department: "Innovation & Incubation",
          active: true,
          passwordHash,
          mustChangePassword: true,
        },
      });
      console.log(`[Seed] Updated ADMIN (password reset from env): ${adminEmail}`);
    } else {
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          name: "IDEAPAD Admin",
          role: "ADMIN",
          approvalStatus: "APPROVED",
          designation: "Director IDEAPAD",
          department: "Innovation & Incubation",
          active: true,
        },
      });
      console.log(`[Seed] Verified ADMIN (password unchanged): ${adminEmail}`);
    }
  }

  console.log("[Seed] Seeding completed successfully. Admin account ready.");
}

main()
  .catch((e) => {
    console.error("[Seed Error]", e?.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
