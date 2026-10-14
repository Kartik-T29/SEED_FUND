import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const prisma = new PrismaClient();

function generateSecureRandomPassword(): string {
  const rand = crypto.randomBytes(12).toString("base64");
  return `A1!${rand}`;
}

const getEnvOrRandom = (key: string, label: string): string => {
  const val = process.env[key];
  if (val && val.trim().length >= 8) {
    return val.trim();
  }
  const generated = generateSecureRandomPassword();
  console.log(`[Seed Notice] No ${key} provided in environment. Generated random initial password for ${label}.`);
  return generated;
};

const adminEmail = (process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL || "admin@ideapad.co.in").toLowerCase().trim();
const sec1Email = (process.env.SEC_MEMBER_1_EMAIL || process.env.SEED_SEC1_EMAIL || "sec1@ideapad.co.in").toLowerCase().trim();
const sec2Email = (process.env.SEC_MEMBER_2_EMAIL || process.env.SEED_SEC2_EMAIL || "sec2@ideapad.co.in").toLowerCase().trim();
const sec3Email = (process.env.SEC_MEMBER_3_EMAIL || process.env.SEED_SEC3_EMAIL || "sec3@ideapad.co.in").toLowerCase().trim();

const users = [
  {
    email: adminEmail,
    name: "IDEAPAD Admin",
    role: "ADMIN" as const,
    designation: "Director IDEAPAD",
    department: "Innovation & Incubation",
    password: getEnvOrRandom("ADMIN_PASSWORD", "Admin"),
  },
  {
    email: sec1Email,
    name: "SEC Member 1",
    role: "SEC_MEMBER" as const,
    designation: "Senior Professor & HoD",
    department: "Computer Science & Engineering",
    password: getEnvOrRandom("SEC_MEMBER_1_PASSWORD", "SEC 1"),
  },
  {
    email: sec2Email,
    name: "SEC Member 2",
    role: "SEC_MEMBER" as const,
    designation: "Associate Professor",
    department: "Electrical Engineering",
    password: getEnvOrRandom("SEC_MEMBER_2_PASSWORD", "SEC 2"),
  },
  {
    email: sec3Email,
    name: "SEC Member 3",
    role: "SEC_MEMBER" as const,
    designation: "Dean R&D",
    department: "School of Management",
    password: getEnvOrRandom("SEC_MEMBER_3_PASSWORD", "SEC 3"),
  },
];

async function main() {
  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 12);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        designation: u.designation,
        department: u.department,
        active: true,
      },
      create: {
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
  }

  const secCount = await prisma.user.count({ where: { role: "SEC_MEMBER" } });
  if (secCount !== 3) {
    console.warn(`[Seed Warning] Expected 3 SEC members, found ${secCount}`);
  }
}

main().finally(() => prisma.$disconnect());
