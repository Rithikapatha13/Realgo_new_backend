import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const id = "5b09fb9e-6dba-44f0-85f4-526264871c81";
  const companyId = "d091df01-a482-4f72-a5e1-58d6ef5ab51e";
  
  // Try to simulate the update:
  let associates = await prisma.user.findMany({
      where: {
          companyId,
          status: "VERIFIED",
          isOnline: true,
          availability: "AVAILABLE"
      },
      include: {
          _count: {
              select: { associateLeads: true }
          }
      }
  });

  console.log("Online associates found:", associates.length);

  if (associates.length === 0) {
      associates = await prisma.user.findMany({
          where: {
              companyId,
              status: "VERIFIED"
          },
          include: {
              _count: {
                  select: { associateLeads: true }
              }
          }
      });
      console.log("Fallback verified associates found:", associates.length);
  }

  if (associates.length > 0) {
      const MIN_ASSOCIATE_LEADS = 2;
      const MAX_ASSOCIATE_CAPACITY = 10;

      const available = associates.filter(
          a => a._count.associateLeads < MAX_ASSOCIATE_CAPACITY
      );
      console.log("Available associates (below capacity):", available.length);

      if (available.length > 0) {
          let selected = null;

          const belowMinimum = available.filter(
              a => a._count.associateLeads < MIN_ASSOCIATE_LEADS
          );

          if (belowMinimum.length > 0) {
              belowMinimum.sort(
                  (a, b) => a._count.associateLeads - b._count.associateLeads
              );
              selected = belowMinimum[0];
          } else {
              const sorted = available.sort(
                  (a, b) => (b.performanceScore || 0) - (a.performanceScore || 0)
              );

              const topBucket = sorted.slice(0, Math.ceil(sorted.length * 0.3));
              const midBucket = sorted.slice(
                  Math.ceil(sorted.length * 0.3),
                  Math.ceil(sorted.length * 0.7)
              );
              const lowBucket = sorted.slice(Math.ceil(sorted.length * 0.7));

              const r = Math.random();
              let pool = [];

              if (r < 0.5) pool = topBucket;
              else if (r < 0.8) pool = midBucket;
              else pool = lowBucket;

              if (pool.length === 0) pool = available;

              pool.sort(
                  (a, b) => a._count.associateLeads - b._count.associateLeads
              );

              selected = pool[0];
          }

          console.log("Selected associate:", selected ? { id: selected.id, name: selected.username } : "None");

          if (selected) {
              const lead = await prisma.lead.update({
                  where: { id },
                  data: { associateId: selected.id },
                  include: {
                      dedicatedTC: { select: { id: true, firstName: true, lastName: true } },
                      adminTC: { select: { id: true, firstName: true, lastName: true } },
                      telecaller: { select: { id: true, firstName: true, lastName: true } },
                      associate: { select: { id: true, firstName: true, lastName: true } }
                  }
              });
              console.log("Lead updated successfully:", lead.id);
          }
      } else {
        console.log("No available associates below capacity.");
      }
  }
}

main()
  .catch(e => console.error("Prisma error:", e))
  .finally(() => prisma.$disconnect());
