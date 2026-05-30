import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    const leadsData = await prisma.lead.findMany({
        include: {
            dedicatedTC: { select: { id: true, firstName: true, lastName: true, image: true } },
            adminTC: { select: { id: true, firstName: true, lastName: true, image: true } },
            telecaller: { select: { id: true, firstName: true, lastName: true } },
            associate: { 
                select: { 
                    id: true, 
                    firstName: true, 
                    lastName: true, 
                    image: true,
                    role: { select: { roleName: true } }
                } 
            },
            user: { 
                select: { 
                    id: true, 
                    firstName: true, 
                    lastName: true,
                    role: { select: { roleName: true } }
                } 
            },
            assignedBy: { 
                select: { 
                    id: true, 
                    firstName: true, 
                    lastName: true,
                    role: { select: { roleName: true } }
                } 
            },
            _count: {
                select: { callLogs: true, meetings: true }
            }
        },
        orderBy: { updatedAt: "desc" },
        take: 3
    });

    const leads = leadsData.map(l => {
        let displayAddedByName = l.addedByName;
        let displayAddedByRole = l.addedByRole;

        if (!displayAddedByName) {
            if (l.associate) {
                displayAddedByName = `${l.associate.firstName || ""} ${l.associate.lastName || ""}`.trim();
                displayAddedByRole = l.associate.role?.roleName || "ASSOCIATE";
            } else if (l.assignedBy) {
                displayAddedByName = `${l.assignedBy.firstName || ""} ${l.assignedBy.lastName || ""}`.trim();
                displayAddedByRole = l.assignedBy.role?.roleName || "ADMIN";
            } else if (l.user) {
                displayAddedByName = `${l.user.firstName || ""} ${l.user.lastName || ""}`.trim();
                displayAddedByRole = l.user.role?.roleName || "ADMIN";
            }
        }

        return {
            leadName: l.leadName,
            addedByName: displayAddedByName,
            addedByRole: displayAddedByRole
        };
    });

    console.log("MAPPED LEADS:", leads);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
