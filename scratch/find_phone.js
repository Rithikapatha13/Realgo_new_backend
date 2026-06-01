import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const phone = '2222222222';
  console.log(`Searching for phone: ${phone}...`);

  const admin = await prisma.admin.findFirst({ where: { phone } });
  console.log('Admin Result:', admin);

  const telecaller = await prisma.telecaller.findFirst({ where: { phone } });
  console.log('Telecaller Result:', telecaller);

  const user = await prisma.user.findFirst({ where: { phone } });
  console.log('User Result:', user);

  await prisma.$disconnect();
}

main();
