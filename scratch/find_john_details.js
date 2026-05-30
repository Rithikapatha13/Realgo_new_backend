import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { username: { contains: "john", mode: "insensitive" } }
  });
  
  if (user) {
    console.log("John Details:");
    console.log("Username:", user.username);
    console.log("First Name:", user.firstName);
    console.log("Last Name:", user.lastName);
    console.log("Phone:", user.phone);
    console.log("Alternative Phone:", user.alternativePhone);
    console.log("Nominee Phone:", user.nomineePhone);
    console.log("Email:", user.email);
  } else {
    console.log("John not found");
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
