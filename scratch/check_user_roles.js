import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      role: { select: { roleName: true } }
    }
  });
  
  const roleCounts = {};
  users.forEach(u => {
    const rName = u.role?.roleName || "No Role";
    roleCounts[rName] = (roleCounts[rName] || 0) + 1;
  });
  
  console.log("Users and their Roles count:", roleCounts);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
