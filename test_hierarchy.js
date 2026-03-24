
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getAllSubordinateIds(prisma, userId) {
    const subs = await prisma.user.findMany({
        where: { referId: userId },
        select: { id: true }
    });

    let allIds = subs.map(s => s.id);
    for (const sub of subs) {
        const nestedIds = await getAllSubordinateIds(prisma, sub.id);
        allIds = [...allIds, ...nestedIds];
    }
    return allIds;
}

async function test() {
    const companyId = "4bfd807c-7ad8-457b-bee5-9d39dc10e980"; // Brandwar company
    const companyUser = await prisma.user.findFirst({
        where: { username: 'company', companyId }
    });

    if (!companyUser) {
        console.log("No company root user found!");
        return;
    }

    console.log("Company root user:", companyUser.id, companyUser.username);

    const subordinates = await prisma.user.findMany({
        where: { referId: companyUser.id }
    });
    console.log(`Direct subordinates of company root: ${subordinates.length}`);

    const allSubordinateIds = await getAllSubordinateIds(prisma, companyUser.id);
    console.log(`Total subordinates in tree: ${allSubordinateIds.length}`);

    // Check if any user has referId that doesn't exist in User table (could be Admin IDs)
    const users = await prisma.user.findMany({
        where: { NOT: { referId: null } },
        select: { referId: true }
    });

    const uniqueReferIds = [...new Set(users.map(u => u.referId))];
    console.log(`Unique referIds in User table: ${uniqueReferIds.length}`);

    // Check which referIds ARE NOT in User table
    const existingUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
    const orphanReferIds = uniqueReferIds.filter(id => !existingUserIds.includes(id));
    console.log(`ReferIds NOT in User table: ${orphanReferIds.length}`);

    if (orphanReferIds.length > 0) {
        console.log("Samples of orphan referIds:", orphanReferIds.slice(0, 5));
        // Check if any of these are Admins
        const admins = await prisma.admin.findMany({
            where: { id: { in: orphanReferIds } },
            select: { id: true, username: true }
        });
        console.log(`Matched as Admins: ${admins.length}`);
        admins.forEach(a => console.log(`- ${a.username} (${a.id})`));
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
