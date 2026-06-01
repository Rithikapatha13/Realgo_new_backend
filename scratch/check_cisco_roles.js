import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companyId = 'e630520d-7876-4552-a38b-34b1a04eac93'; // cisco
  const roles = await prisma.role.findMany({
    where: { companyId }
  });
  
  for (const r of roles) {
    console.log(`Role: ${r.roleName} (${r.displayName})`);
    console.log('Modules:', r.modules);
    console.log('------------------------------------');
  }

  await prisma.$disconnect();
}

main();
