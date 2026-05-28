import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const company = await prisma.company.findFirst();
  if (!company) {
    console.log("No companies in the database");
    return;
  }
  const companyId = company.id;
  console.log("Using companyId:", companyId);

  // Let's run the Promise.all part from `/stats`
  try {
    const baseWhere = { companyId };
    console.log("Running count queries...");
    const [
        total,
        hot,
        warm,
        cold,
        newL,
        later,
        unassigned,
        sitevisits,
        booked,
        paymentPending
    ] = await Promise.all([
        prisma.lead.count({ where: baseWhere }),
        prisma.lead.count({ where: { ...baseWhere, leadStatus: 'HOT' } }),
        prisma.lead.count({ where: { ...baseWhere, leadStatus: 'WARM' } }),
        prisma.lead.count({ where: { ...baseWhere, leadStatus: 'COLD' } }),
        prisma.lead.count({ where: { ...baseWhere, leadStatus: 'NEW' } }),
        prisma.lead.count({ where: { ...baseWhere, leadStatus: 'LATER' } }),
        prisma.lead.count({ where: { ...baseWhere, dedicatedTCId: null, adminTCId: null } }),
        prisma.lead.count({ where: { ...baseWhere, assocStatus: 'SITEVISIT' } }),
        prisma.lead.count({ where: { ...baseWhere, assocStatus: 'BOOKED' } }),
        prisma.lead.count({ where: { ...baseWhere, assocStatus: 'PAYMENT_PENDING' } })
    ]);
    console.log("Counts:", { total, hot, warm, cold, newL, later, unassigned, sitevisits, booked, paymentPending });
  } catch (err) {
    console.error("Error in counts query:", err);
  }

  try {
    console.log("Running top TCs query...");
    const topTCs = await prisma.admin.findMany({
        where: { companyId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            telecallerLeads: {
                where: { leadStatus: 'HOT' }
            }
        },
        take: 5
    });
    console.log("Top TCs:", topTCs);
  } catch (err) {
    console.error("Error in top TCs query:", err);
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
