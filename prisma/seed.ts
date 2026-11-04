import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD || process.env.SEED_ADMIN_PW;

  if (!adminEmail || !adminPassword) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD (or SEED_ADMIN_PW) must be configured as environment variables. No default credentials permitted."
    );
  }

  // 1. Seed or update Admin account
  const adminHash = await bcrypt.hash(adminPassword, 12);
  await prisma.user.upsert({
    where: { email: adminEmail.trim().toLowerCase() },
    update: {}, // Never overwrite password on existing user
    create: {
      email: adminEmail.trim().toLowerCase(),
      name: "IDEAPAD Administrator",
      role: "ADMIN",
      passwordHash: adminHash,
      approvalStatus: "APPROVED",
      active: true,
      designation: "Incubation Center Administrator",
      department: "IDEAPAD",
      mustChangePassword: false,
    },
  });
  console.log(`Admin account seeded: ${adminEmail}`);

  // 2. Seed SEC Panel Members (P3) if credentials configured in environment
  const secMembers = [
    {
      envEmail: "SEC_MEMBER_1_EMAIL",
      envPass: "SEC_MEMBER_1_PASSWORD",
      name: "Arun Singh Kushwah",
      designation: "Assistant Director (Startups)",
      department: "SOET, ITM University",
    },
    {
      envEmail: "SEC_MEMBER_2_EMAIL",
      envPass: "SEC_MEMBER_2_PASSWORD",
      name: "Ambar Agarwal",
      designation: "Associate Professor",
      department: "School of Management, ITM University",
    },
    {
      envEmail: "SEC_MEMBER_3_EMAIL",
      envPass: "SEC_MEMBER_3_PASSWORD",
      name: "Ashish Chandel",
      designation: "Professor of Practice, Director IDEAPAD",
      department: "ITM University",
    },
  ];

  for (const sec of secMembers) {
    const email = process.env[sec.envEmail] || (process.env.SEED_SEC_EMAIL_PREFIX ? `${sec.envEmail.toLowerCase()}@ideapad.co.in` : undefined);
    const password = process.env[sec.envPass] || process.env.SEED_SEC_PW;

    if (email && password) {
      const hash = await bcrypt.hash(password, 12);
      await prisma.user.upsert({
        where: { email: email.trim().toLowerCase() },
        update: {
          designation: sec.designation,
          department: sec.department,
        },
        create: {
          email: email.trim().toLowerCase(),
          name: sec.name,
          role: "SEC_MEMBER",
          passwordHash: hash,
          approvalStatus: "APPROVED",
          active: true,
          designation: sec.designation,
          department: sec.department,
          mustChangePassword: false,
        },
      });
      console.log(`SEC member seeded: ${sec.name} (${email})`);
    }
  }

  // 3. Demo startup for dev/test environments only
  const demoStartupEmail = process.env.DEMO_STARTUP_EMAIL;
  const demoStartupPass = process.env.DEMO_STARTUP_PASSWORD;
  if (demoStartupEmail && demoStartupPass) {
    const startupHash = await bcrypt.hash(demoStartupPass, 12);
    const s = await prisma.user.upsert({
      where: { email: demoStartupEmail.trim().toLowerCase() },
      update: {},
      create: {
        email: demoStartupEmail.trim().toLowerCase(),
        name: "Demo Founder",
        role: "STARTUP",
        approvalStatus: "APPROVED",
        active: true,
        passwordHash: startupHash,
      },
    });
    await prisma.startup.upsert({
      where: { userId: s.id },
      update: {},
      create: {
        userId: s.id,
        teamName: "AeroTech Innovations",
        enrollmentNo: "BETN2024001",
        program: "B.Tech Computer Science",
        department: "School of Engineering & Technology",
        phone: "9876543210",
      },
    });
    console.log(`Demo startup seeded: ${demoStartupEmail}`);
  }
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
