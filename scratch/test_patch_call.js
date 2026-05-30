import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  const id = "5b09fb9e-6dba-44f0-85f4-526264871c81"; // aarav
  const companyId = "d091df01-a482-4f72-a5e1-58d6ef5ab51e";
  
  // Simulated req.user for Telecaller Admin
  const user = {
    userId: "587c57d9-33f6-4c43-9933-6a73f28a6d4d", // TCA Admin ID
    userType: "admin",
    role: { roleName: "TELECALLER ADMIN" }
  };

  const status = "HOT";
  const notes = "okayy";
  const callbackAt = null;
  const isAssociateUpdate = undefined;

  const roleName = (user.role?.roleName || "").toUpperCase();
  const userType = (user.userType || "").toLowerCase();
  
  // 1. Find lead
  let lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead || lead.companyId !== companyId) {
      console.log("Lead not found or company mismatch");
      return;
  }

  console.log("Lead found:", lead.leadName);

  // Determine if updating telecaller status (HOT/COLD) or Assoc status (SITEVISIT)
  let updateData = {};
  
  const isTelecaller = roleName === "TELECALLER";
  const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";
  const isAssociate = !isAdmin && !isTelecaller;

  if (isAssociateUpdate || isAssociate) {
      updateData.assocStatus = status;
      updateData.notes = notes;
  } else {
      updateData.leadStatus = status;
      updateData.notes = notes;
  }

  // 2. Update lead status
  lead = await prisma.lead.update({
      where: { id },
      data: updateData
  });
  console.log("Lead updated status to:", lead.leadStatus);

  // 3. Create call log
  if (userType === "telecaller" || (userType === "admin" && roleName === "TELECALLER ADMIN")) {
      const callLog = await prisma.callLog.create({
          data: {
              leadId: id,
              dedicatedTCId: userType === "telecaller" ? user.userId : null,
              adminTCId: userType === "admin" ? user.userId : null,
              status: status,
              notes: notes,
              callbackAt: callbackAt ? new Date(callbackAt) : null
          }
      });
      console.log("CallLog created:", callLog.id);
  }

  // 4. Escalate to Associate (Auto-Assignment for HOT leads using weighted multi-bucket performance balancer)
  if (!isAssociateUpdate && !isAssociate && status === "HOT" && !lead.associateId) {
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

      console.log("Online associates count:", associates.length);

      // Fallback: If no online available associates are found, grab any verified associates
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
          console.log("Fallback associates count:", associates.length);
      }

      if (associates.length > 0) {
          const MIN_ASSOCIATE_LEADS = 2;
          const MAX_ASSOCIATE_CAPACITY = 10;

          const available = associates.filter(
              a => a._count.associateLeads < MAX_ASSOCIATE_CAPACITY
          );
          console.log("Available associates count:", available.length);

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

              console.log("Selected associate:", selected ? selected.username : "none");

              if (selected) {
                  lead = await prisma.lead.update({
                      where: { id },
                      data: { associateId: selected.id },
                      include: {
                          dedicatedTC: { select: { id: true, firstName: true, lastName: true } },
                          adminTC: { select: { id: true, firstName: true, lastName: true } },
                          telecaller: { select: { id: true, firstName: true, lastName: true } },
                          associate: { select: { id: true, firstName: true, lastName: true } }
                      }
                  });
                  console.log("Associate assigned:", lead.associateId);

                  // Create an EventLog entry for the auto-transfer
                  const eventLog = await prisma.eventLog.create({
                      data: {
                          category: "LEAD_ESCALATION",
                          actionBy: user.username || "System",
                          actionDescription: `Lead ${lead.leadName} transferred to associate ${selected.firstName || selected.username} by ${user.firstName || user.username}`,
                          companyId
                      }
                  });
                  console.log("EventLog created:", eventLog.id);
              }
          }
      }
  }
}

main()
  .catch(e => console.error("Prisma error:", e))
  .finally(() => prisma.$disconnect());
