import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst({
    where: { company: { contains: 'Real Go', mode: 'insensitive' } }
  });

  if (company) {
    console.log('Real Go Company:', {
      id: company.id,
      company: company.company,
      modules: company.modules
    });

    const roles = await prisma.role.findMany({
      where: { companyId: company.id }
    });
    console.log('Real Go Roles:');
    console.table(roles.map(r => ({ roleName: r.roleName, displayName: r.displayName, modules: r.modules })));
  }

  await prisma.$disconnect();
}

main();
