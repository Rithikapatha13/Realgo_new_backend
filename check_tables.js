import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({ include: { role: true } });
  const admins = await prisma.admin.findMany({ include: { role: true } });
  
  const userRoles = [...new Set(users.map(u => u.role?.roleName))].sort();
  const adminRoles = [...new Set(admins.map(a => a.role?.roleName))].sort();

  console.log('USER_TABLE_ROLES:' + userRoles.join(','));
  console.log('ADMIN_TABLE_ROLES:' + adminRoles.join(','));
}

main().finally(() => prisma.$disconnect());
