import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const leads = await prisma.lead.findMany({
    where: {
      companyId: "d091df01-a482-4f72-a5e1-58d6ef5ab51e"
    },
    select: {
      id: true,
      leadName: true,
      leadContact: true,
      leadStatus: true,
      dedicatedTCId: true,
      adminTCId: true,
      createdAt: true
    },
    orderBy: { createdAt: "desc" }
  });
  console.log("All Leads in company:", JSON.stringify(leads, null, 2));
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
