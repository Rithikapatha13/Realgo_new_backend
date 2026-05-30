import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  console.log("=== ADMINS ===");
  const admins = await prisma.admin.findMany({
    include: { role: true, company: true }
  });
  for (const a of admins) {
    console.log(`Admin: ${a.username} | Phone: ${a.phone} | Role: ${a.role?.roleName} | Co: ${a.company?.company}`);
  }

  console.log("\n=== CLIENT ADMINS ===");
  const clientAdmins = await prisma.clientAdmin.findMany({
    include: { company: true }
  });
  for (const c of clientAdmins) {
    console.log(`ClientAdmin: ${c.username} | Phone: ${c.phone} | Co: ${c.company?.company}`);
  }
}

main().finally(() => prisma.$disconnect());
