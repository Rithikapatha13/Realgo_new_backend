import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const companyRole = await prisma.role.findFirst({
    where: { roleName: { equals: 'company', mode: 'insensitive' } }
  });
  
  if (!companyRole) {
    console.log("No Company role found");
    return;
  }

  const companyUsers = await prisma.user.findMany({
    where: { roleId: companyRole.id }
  });

  console.log("Company Role Users:", companyUsers.map(u => u.username));

  for (const u of companyUsers) {
    const reports = await prisma.user.count({ where: { referId: u.id } });
    console.log(`User ${u.username} has ${reports} reports`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
