import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
    // Find all meetings that are confirmed bookings
    const bookedMeetings = await prisma.meeting.findMany({
        where: {
            OR: [
                { outcome: "BOOKED" },
                { bookingStatus: "BOOKED" }
            ]
        }
    });

    console.log(`Found ${bookedMeetings.length} booked meetings. Updating corresponding leads...`);

    let updatedCount = 0;
    for (const meeting of bookedMeetings) {
        const lead = await prisma.lead.findUnique({
            where: { id: meeting.leadId }
        });

        if (lead && lead.assocStatus !== "BOOKED") {
            await prisma.lead.update({
                where: { id: lead.id },
                data: { assocStatus: "BOOKED" }
            });
            console.log(`Updated lead ${lead.leadName} (${lead.id}) assocStatus to BOOKED.`);
            updatedCount++;
        }
    }

    console.log(`Successfully updated ${updatedCount} leads to BOOKED.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
