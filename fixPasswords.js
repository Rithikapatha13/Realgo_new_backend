import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function fixDefaultPasswords() {
  console.log("🔧 Fixing default passwords...\n");

  const newDefault = "Realgo@123";
  const hashedPassword = await bcrypt.hash(newDefault, 10);

  // Find all admins that have NOT changed their password (still on default)
  const admins = await prisma.admin.findMany({
    where: { passwordChanged: false },
    select: { id: true, username: true, phone: true, companyId: true },
  });

  console.log(`Found ${admins.length} admin(s) with default password:`);
  admins.forEach((a) => console.log(`  - ${a.username} (${a.phone})`));

  if (admins.length > 0) {
    const result = await prisma.admin.updateMany({
      where: { passwordChanged: false },
      data: { password: hashedPassword },
    });
    console.log(`\n✅ Updated ${result.count} admin(s) → password set to "${newDefault}"`);
  }

  // Also fix users with default password (passwordChanged: false)
  const users = await prisma.user.findMany({
    where: { passwordChanged: false },
    select: { id: true, username: true, phone: true },
  });

  console.log(`\nFound ${users.length} user(s) with default password.`);

  if (users.length > 0) {
    const result = await prisma.user.updateMany({
      where: { passwordChanged: false },
      data: { password: hashedPassword },
    });
    console.log(`✅ Updated ${result.count} user(s) → password set to "${newDefault}"`);
  }

  console.log("\n🎉 Done! All default passwords are now Realgo@123");
  await prisma.$disconnect();
}

fixDefaultPasswords().catch((e) => {
  console.error("❌ Error:", e);
  process.exit(1);
});
