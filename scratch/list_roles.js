import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    select: {
      id: true,
      roleName: true,
      displayName: true,
      companyId: true,
      companyName: true
    }
  });
  console.log('All Roles in DB:', roles);
  await prisma.$disconnect();
}

main();
