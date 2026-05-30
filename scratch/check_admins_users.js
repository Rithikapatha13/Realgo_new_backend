import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const admins = await prisma.admin.findMany();
  console.log(`Total admins: ${admins.length}`);
  
  for (const admin of admins) {
    const user = await prisma.user.findFirst({
      where: { phone: admin.phone }
    });
    console.log(`Admin username: ${admin.username}, phone: ${admin.phone} -> User: ${user ? user.username : 'Not found'}`);
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
