import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- SYSTEM ROLES ---');
  const roles = await prisma.role.findMany({ select: { id: true, roleName: true, displayName: true } });
  roles.forEach(r => console.log(`Role: [${r.roleName}] | Display: [${r.displayName}] | ID: ${r.id}`));

  console.log('\n--- ATTEMPTING TO FIND USERS WITH ASSOCIATE-LIKE ROLES ---');
  const users = await prisma.user.findMany({
    include: { role: true, company: true }
  });

  const associates = users.filter(u => {
    const name = (u.role?.roleName || "").toLowerCase();
    const disp = (u.role?.displayName || "").toLowerCase();
    return name.includes("associate") || disp.includes("associate");
  });

  if (associates.length === 0) {
    console.log('No Associates found in User table.');
  } else {
    associates.forEach(u => {
      console.log(`- ${u.firstName} ${u.lastName || ''} (${u.username}) | Role: ${u.role?.displayName} | Co: ${u.company?.company}`);
    });
  }

  const admins = await prisma.admin.findMany({
     include: { role: true, company: true }
  });

  const adminAssoc = admins.filter(a => {
    const name = (a.role?.roleName || "").toLowerCase();
    const disp = (a.role?.displayName || "").toLowerCase();
    return name.includes("associate") || disp.includes("associate");
  });

  if (adminAssoc.length > 0) {
    console.log('\n--- ASSOCIATES FOUND IN ADMIN TABLE ---');
    adminAssoc.forEach(a => {
      console.log(`- ${a.firstName} ${a.lastName || ''} (${a.username}) | Role: ${a.role?.displayName} | Co: ${a.company?.company}`);
    });
  }
}

main().finally(() => prisma.$disconnect());
