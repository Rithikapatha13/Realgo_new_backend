import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany({
    select: { id: true, company: true, modules: true }
  });

  console.log('All Companies and their modules:');
  for (const c of companies) {
    console.log(`Company: ${c.company} (${c.id})`);
    console.log('Modules:', c.modules);
    console.log('------------------------------------');
  }

  await prisma.$disconnect();
}

main();
