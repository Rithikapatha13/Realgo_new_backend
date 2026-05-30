import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const userById = await prisma.user.findUnique({
    where: { id: "eed8cc40-e241-4e2d-a71d-cf8f8eb9ee73" },
    include: { role: true }
  });
  
  const usersByUsername = await prisma.user.findMany({
    where: { username: { contains: "john", mode: "insensitive" } },
    include: { role: true }
  });
  
  console.log("User by ID eed8cc40-e241-4e2d-a71d-cf8f8eb9ee73:", JSON.stringify(userById, null, 2));
  console.log("Users matching username 'john':", JSON.stringify(usersByUsername, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
