import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
const prisma = new PrismaClient();

const isProd = process.env.NODE_ENV === "production";
// DEV/TEST ONLY defaults. In production every password must come from env and be changed on first login.
const pw = (key: string, fallback: string) => {
  const v = process.env[key] ?? (isProd ? undefined : fallback);
  if (!v) throw new Error(`Missing ${key} in production`);
  return v;
};

const users = [
  {
    email: "admin@test.com",
    name: "IDEAPAD Admin",
    role: "ADMIN" as const,
    password: pw("SEED_ADMIN_PW", "Admin@123"),
    approvalStatus: "APPROVED",
    active: true,
  },
  {
    email: "sec@test.com",
    name: "SEC Test Member",
    role: "SEC_MEMBER" as const,
    password: pw("SEED_SEC_PW", "Sec@123"),
    approvalStatus: "APPROVED",
    active: true,
    designation: "Test SEC Panelist",
    department: "Innovation & Incubation",
  },
];

async function main() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {}, // never overwrite an existing password on re-seed
      create: {
        email: u.email,
        name: u.name,
        role: u.role,
        passwordHash,
        approvalStatus: u.approvalStatus,
        active: u.active,
        designation: (u as any).designation,
        department: (u as any).department,
        mustChangePassword: isProd,
      },
    });
  }

  if (!isProd) {
    const s = await prisma.user.upsert({
      where: { email: "startup1@test.com" },
      update: {},
      create: {
        email: "startup1@test.com",
        name: "Demo Startup",
        role: "STARTUP",
        approvalStatus: "APPROVED",
        active: true,
        passwordHash: await bcrypt.hash("Startup@123", 12),
      },
    });
    await prisma.startup.upsert({
      where: { userId: s.id },
      update: {},
      create: {
        userId: s.id,
        teamName: "Demo Team",
        enrollmentNo: "0000000000",
        program: "B.Tech IT",
        phone: "0000000000",
      },
    });
  }
}

main().finally(() => prisma.$disconnect());
