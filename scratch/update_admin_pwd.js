import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("Realgo@123", 10);
  const result = await prisma.admin.updateMany({
    where: { phone: "1111111111" },
    data: { 
      password: hashedPassword,
      passwordChanged: true
    }
  });
  console.log(`Updated admin count: ${result.count}`);
}

main().finally(() => prisma.$disconnect());
