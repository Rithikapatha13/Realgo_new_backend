const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    include: { role: true }
  });
  console.log('Total Users:', users.length);
  users.forEach(u => {
    console.log(`Phone: ${u.phone}, Username: ${u.username}, Role: ${u.role?.name}`);
  });
}

main().catch(e => console.error(e)).finally(() => prisma.$disconnect());
