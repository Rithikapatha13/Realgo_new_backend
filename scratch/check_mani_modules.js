import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.admin.findFirst({
    where: { phone: '2222222222' },
    include: {
      role: true
    }
  });

  console.log('Mani Info:', {
    username: admin?.username,
    roleName: admin?.role?.roleName,
    modules: admin?.role?.modules,
    companyId: admin?.companyId
  });

  if (admin) {
    const company = await prisma.company.findUnique({
      where: { id: admin.companyId }
    });
    console.log('Company modules:', company?.modules);
  }

  await prisma.$disconnect();
}

main();
