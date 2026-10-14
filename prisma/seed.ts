import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

function requireEnv(names: string[], label: string): string {
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

  const sec1Email = requireEnv(["SEC_MEMBER_1_EMAIL", "SEC1_EMAIL", "SEED_SEC1_EMAIL"], "SEC Member 1 Email").toLowerCase().trim();
  const sec1Password = requireEnv(["SEC_MEMBER_1_PASSWORD", "SEC1_PASSWORD", "SEED_SEC1_PASSWORD"], "SEC Member 1 Password");

  const sec2Email = requireEnv(["SEC_MEMBER_2_EMAIL", "SEC2_EMAIL", "SEED_SEC2_EMAIL"], "SEC Member 2 Email").toLowerCase().trim();
  const sec2Password = requireEnv(["SEC_MEMBER_2_PASSWORD", "SEC2_PASSWORD", "SEED_SEC2_PASSWORD"], "SEC Member 2 Password");

  const sec3Email = requireEnv(["SEC_MEMBER_3_EMAIL", "SEC3_EMAIL", "SEED_SEC3_EMAIL"], "SEC Member 3 Email").toLowerCase().trim();
  const sec3Password = requireEnv(["SEC_MEMBER_3_PASSWORD", "SEC3_PASSWORD", "SEED_SEC3_PASSWORD"], "SEC Member 3 Password");

  const users: Array<{
    email: string;
    name: string;
    role: Role;
    designation: string;
    department: string;
    password: string;
  }> = [
    {
      email: adminEmail,
      name: "IDEAPAD Admin",
      role: "ADMIN",
      designation: "Director IDEAPAD",
      department: "Innovation & Incubation",
      password: adminPassword,
    },
    {
      email: sec1Email,
      name: "SEC Member 1",
      role: "SEC_MEMBER",
      designation: "Senior Professor & HoD",
      department: "Computer Science & Engineering",
      password: sec1Password,
    },
    {
      email: sec2Email,
      name: "SEC Member 2",
      role: "SEC_MEMBER",
      designation: "Associate Professor",
      department: "Electrical Engineering",
      password: sec2Password,
    },
    {
      email: sec3Email,
      name: "SEC Member 3",
      role: "SEC_MEMBER",
      designation: "Dean R&D",
      department: "School of Management",
      password: sec3Password,
    },
  ];

  for (const u of users) {
    const existing = await prisma.user.findUnique({
      where: { email: u.email },
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash(u.password, 12);
      await prisma.user.create({
        data: {
          email: u.email,
          name: u.name,
          role: u.role,
          designation: u.designation,
          department: u.department,
          active: true,
          passwordHash,
          mustChangePassword: true,
        },
      });
      console.log(`[Seed] Created ${u.role}: ${u.email}`);
    } else {
      const passwordMatches = await bcrypt.compare(u.password, existing.passwordHash);
      if (!passwordMatches) {
        const passwordHash = await bcrypt.hash(u.password, 12);
        await prisma.user.update({
          where: { email: u.email },
          data: {
            name: u.name,
            role: u.role,
            designation: u.designation,
            department: u.department,
            active: true,
            passwordHash,
            mustChangePassword: true,
          },
        });
        console.log(`[Seed] Updated ${u.role} (password reset from env): ${u.email}`);
      } else {
        await prisma.user.update({
          where: { email: u.email },
          data: {
            name: u.name,
            role: u.role,
            designation: u.designation,
            department: u.department,
            active: true,
          },
        });
        console.log(`[Seed] Verified ${u.role} (password unchanged): ${u.email}`);
      }
    }
  }

  const secCount = await prisma.user.count({ where: { role: "SEC_MEMBER", active: true } });
  console.log(`[Seed] Active SEC Evaluators count: ${secCount}`);
  console.log("[Seed] Seeding completed successfully.");
}

main()
  .catch((e: any) => {
    console.error("[Seed Error]", e?.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
