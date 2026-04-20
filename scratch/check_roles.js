import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const roles = await prisma.role.findMany();
  console.log('ROLES:', roles.map(r => r.roleName));
  const users = await prisma.user.findMany({ select: { role: { select: { roleName: true } } } });
  const counts = {};
  users.forEach(u => {
    const r = u.role?.roleName || 'No Role';
    counts[r] = (counts[r] || 0) + 1;
  });
  console.log('USER COUNTS BY ROLE:', counts);
}
main().catch(console.error).finally(() => prisma.$disconnect());
