import "dotenv/config";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function check() {
  const companies = await prisma.company.findMany();
  console.log("Companies:", companies);

  const users = await prisma.user.findMany({ take: 2 });
  console.log("Some users:", users);

  const admins = await prisma.admin.findMany({ take: 2 });
  console.log("Some admins:", admins);

  await prisma.$disconnect();
}

check().catch(e => {
  console.error(e);
  process.exit(1);
});
