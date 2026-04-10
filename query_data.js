import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- ALL COMPANIES ---');
  const companies = await prisma.company.findMany({ take: 5, orderBy: { createdAt: 'desc' } });
  console.log(JSON.stringify(companies, null, 2));

  console.log('--- ALL ROLES (RECENT) ---');
  const roles = await prisma.role.findMany({ take: 10, orderBy: { createdAt: 'desc' }, include: { company: true } });
  console.log(JSON.stringify(roles, null, 2));

  console.log('--- SEARCHING FOR ID ---');
  const targetId = '8d5c10bd-e384-43f4-93d3-50fcdac0ce6c';
  // Check if it's a role ID
  const roleById = await prisma.role.findUnique({ where: { id: targetId }, include: { company: true } });
  if (roleById) {
    console.log('ID is a ROLE ID:', JSON.stringify(roleById, null, 2));
    const admins = await prisma.admin.findMany({ where: { roleId: targetId } });
    console.log('Admins with this Role ID:', JSON.stringify(admins, null, 2));
  } else {
     // Check if it's a company ID
     const companyById = await prisma.company.findUnique({ where: { id: targetId } });
     if (companyById) {
        console.log('ID is a COMPANY ID:', JSON.stringify(companyById, null, 2));
     } else {
        console.log('ID not found as Role or Company!');
     }
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
