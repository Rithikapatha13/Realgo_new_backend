import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: "9542200152" },
    include: { company: true }
  });
  if (user) {
    console.log(`User: ${user.firstName} ${user.lastName} | Phone: ${user.phone} | Co: ${user.company?.company}`);
  } else {
    console.log("Santhosh not found");
  }
}

main().finally(() => prisma.$disconnect());
