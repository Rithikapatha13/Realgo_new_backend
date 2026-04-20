import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const roles = await prisma.role.findMany({
    select: { id: true, roleName: true, displayName: true, modules: true, roleNo: true }
  });
  console.log('--- ROLES WITH MODULES ---');
  roles.forEach(r => {
    console.log(`${r.roleName} (${r.roleNo}): [${r.modules.join(', ')}]`);
  });
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
