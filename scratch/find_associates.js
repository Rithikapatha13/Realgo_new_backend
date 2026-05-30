import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/password.js";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { phone: "9542200152" },
    include: { company: true }
  });

  if (!user) {
    console.log("Santhosh not found");
    return;
  }

  const hashedPassword = await hashPassword("Realgo@123");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password: hashedPassword,
      passwordChanged: true
    }
  });

  console.log(`Updated successfully:`);
  console.log(`Username: ${user.username}`);
  console.log(`Phone: ${user.phone}`);
  console.log(`Company: ${user.company.company} (ID: ${user.company.id})`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
