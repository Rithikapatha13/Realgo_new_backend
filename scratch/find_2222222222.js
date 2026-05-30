import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const phone = "2222222222";
  
  const inUser = await prisma.user.findFirst({ where: { phone } });
  const inTelecaller = await prisma.telecaller.findFirst({ where: { phone } });
  const inAdmin = await prisma.admin.findFirst({ where: { phone } });
  
  console.log("In User table:", inUser ? { id: inUser.id, username: inUser.username } : "Not found");
  console.log("In Telecaller table:", inTelecaller ? { id: inTelecaller.id, username: inTelecaller.username } : "Not found");
  console.log("In Admin table:", inAdmin ? { id: inAdmin.id, username: inAdmin.username } : "Not found");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
