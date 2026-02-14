import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const founderEmail = process.env.FOUNDER_EMAIL;
  const founderPassword = process.env.FOUNDER_PASSWORD;
  const founderUsername = process.env.FOUNDER_USERNAME ?? "founder";
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const adminUsername = process.env.ADMIN_USERNAME ?? "admin";

  if (founderEmail && founderPassword) {
    const founderPasswordHash = await bcrypt.hash(founderPassword, 10);
    const founder = await prisma.user.upsert({
      where: { email: founderEmail },
      update: {
        username: founderUsername,
        passwordHash: founderPasswordHash,
        role: Role.FOUNDER,
        isActive: true
      },
      create: {
        username: founderUsername,
        email: founderEmail,
        passwordHash: founderPasswordHash,
        role: Role.FOUNDER
      }
    });

    await prisma.chat.upsert({
      where: { userId: founder.id },
      update: {},
      create: { userId: founder.id }
    });

    console.log(`Founder user ready: ${founderEmail}`);
  }

  if (adminEmail && adminPassword) {
    const adminPasswordHash = await bcrypt.hash(adminPassword, 10);
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        username: adminUsername,
        passwordHash: adminPasswordHash,
        role: Role.ADMIN,
        isActive: true
      },
      create: {
        username: adminUsername,
        email: adminEmail,
        passwordHash: adminPasswordHash,
        role: Role.ADMIN
      }
    });

    await prisma.chat.upsert({
      where: { userId: admin.id },
      update: {},
      create: { userId: admin.id }
    });

    console.log(`Admin user ready: ${adminEmail}`);
  }

  if (!founderEmail && !adminEmail) {
    console.log("Skipping seed user creation because no founder/admin env is provided.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
