import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const id = "b8affb60-b381-41a0-8a7b-11dce4f5427a";
  
  const inUser = await prisma.user.findUnique({ where: { id } });
  const inTelecaller = await prisma.telecaller.findUnique({ where: { id } });
  
  console.log("In User table:", inUser ? { id: inUser.id, username: inUser.username } : "Not found");
  console.log("In Telecaller table:", inTelecaller ? { id: inTelecaller.id, username: inTelecaller.username } : "Not found");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
