import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.role.updateMany({
    where: {
      roleName: 'pro',
      displayName: 'Telecaller Admin'
    },
    data: {
      roleName: 'telecalleradmin'
    }
  });
  console.log(`Updated ${result.count} roles.`);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
