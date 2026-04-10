import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const allRoles = await prisma.role.findMany({
    select: { roleName: true, displayName: true }
  });
  console.log('--- SYSTEM ROLES ---');
  console.log(JSON.stringify(allRoles, null, 2));

  const accountants = allRoles.filter(r => 
    r.roleName.toLowerCase().includes('account') || 
    r.displayName.toLowerCase().includes('account')
  );
  console.log('--- ACCOUNTANT-LIKE ROLES ---');
  console.log(JSON.stringify(accountants, null, 2));

  const telecallers = allRoles.filter(r => 
    r.roleName.toLowerCase().includes('telecaller') || 
    r.displayName.toLowerCase().includes('telecaller')
  );
  console.log('--- TELECALLER-LIKE ROLES ---');
  console.log(JSON.stringify(telecallers, null, 2));
}

main().finally(() => prisma.$disconnect());
