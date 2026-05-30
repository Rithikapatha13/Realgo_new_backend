import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.lead.update({
    where: { id: "5b09fb9e-6dba-44f0-85f4-526264871c81" },
    data: { associateId: null, leadStatus: "NEW" }
  });
  console.log("Reset aarav");
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
