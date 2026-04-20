import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    select: { id: true, roleName: true, displayName: true }
  });
  console.log('--- ROLES ---');
  console.table(roles);

  const admins = await prisma.admin.findMany({
    select: { username: true, role: { select: { roleName: true } } },
    take: 10
  });
  console.log('--- ADMINS ---');
  console.table(admins.map(a => ({ username: a.username, role: a.role?.roleName })));
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
