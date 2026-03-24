
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function test() {
    const companyId = "4bfd807c-7ad8-457b-bee5-9d39dc10e980"; // Brandwar company

    const totalUsers = await prisma.user.count({ where: { companyId } });
    console.log(`Total users in company Brandwar: ${totalUsers}`);

    const rootUsers = await prisma.user.findMany({
        where: { companyId, referId: null }
    });
    console.log(`Users with referId=null in company: ${rootUsers.length}`);
    rootUsers.forEach(u => console.log(`- ${u.username} (${u.id})`));

    const companyUser = rootUsers.find(u => u.username === 'company');
    if (!companyUser) {
        console.log("No user with username='company' and referId=null found!");
    } else {
        const directs = await prisma.user.count({ where: { referId: companyUser.id } });
        console.log(`Direct subordinates of 'company' user: ${directs}`);
    }

    // Check for users whose referId is NOT in the User table
    const allUserIds = (await prisma.user.findMany({ select: { id: true } })).map(u => u.id);
    const usersWithRefer = await prisma.user.findMany({
        where: { NOT: { referId: null } },
        select: { id: true, username: true, referId: true }
    });

    const orphans = usersWithRefer.filter(u => !allUserIds.includes(u.referId));
    console.log(`Users with referId NOT pointing to any User: ${orphans.length}`);

    if (orphans.length > 0) {
        const orphanReferIds = [...new Set(orphans.map(o => o.referId))];
        console.log(`Unique orphan referIds: ${orphanReferIds.length}`);

        const matchedAdmins = await prisma.admin.findMany({
            where: { id: { in: orphanReferIds } },
            select: { id: true, username: true }
        });
        console.log(`Orphan referIds matched to Admins: ${matchedAdmins.length}`);
        matchedAdmins.forEach(a => console.log(`- Admin: ${a.username} (${a.id})`));

        const remainingOrphans = orphanReferIds.filter(id => !matchedAdmins.map(a => a.id).includes(id));
        console.log(`Orphan referIds NOT matched to Admins: ${remainingOrphans.length}`);
        if (remainingOrphans.length > 0) {
            console.log("Sample unknown referIds:", remainingOrphans.slice(0, 5));
        }
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
