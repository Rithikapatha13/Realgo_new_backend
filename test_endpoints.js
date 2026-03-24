
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function getAllSubordinateIds(prisma, userId, status, companyId) {
    const subs = await prisma.user.findMany({
        where: {
            referId: userId,
            companyId,
            ...(status ? { status } : {})
        },
        select: { id: true }
    });

    let ids = subs.map(s => s.id);
    for (const sub of subs) {
        const childIds = await getAllSubordinateIds(prisma, sub.id, status, companyId);
        ids = ids.concat(childIds);
    }
    return ids;
}

async function test() {
    const companyId = "4bfd807c-7ad8-457b-bee5-9d39dc10e980"; // Brandwar
    const mockUser = {
        userId: "46d042f8-0857-4144-8d45-12005a8f58c7", // Admin ID
        userType: "admin",
        companyId: companyId,
        role: { roleName: "admin" }
    };

    console.log("Simulating /my-team for Admin...");

    const roleName = typeof mockUser.role === 'string' ? mockUser.role : mockUser.role?.roleName;
    const isAdmin = mockUser.userType?.toLowerCase() === 'admin' || roleName?.toLowerCase() === 'admin';

    let userId = mockUser.userId;
    if (isAdmin) {
        const companyUser = await prisma.user.findFirst({
            where: { username: 'company', companyId }
        });
        if (companyUser) {
            userId = companyUser.id;
            console.log("MAPPED to company user ID:", userId);
        }
    }

    const allSubordinateIds = await getAllSubordinateIds(prisma, userId, 'VERIFIED', companyId);
    console.log("Total subordinates found:", allSubordinateIds.length);

    if (allSubordinateIds.length > 0) {
        const sample = await prisma.user.findMany({
            where: { id: { in: allSubordinateIds.slice(0, 5) } },
            select: { username: true }
        });
        console.log("Sample subordinates:", sample.map(s => s.username));
    }

    console.log("\nSimulating /associates-tree for Admin...");
    let startId = userId;
    const allUsers = await prisma.user.findMany({
        where: { companyId, status: 'VERIFIED' },
        include: { role: true }
    });
    console.log("Total users fetched for tree:", allUsers.length);

    const userMap = new Map();
    allUsers.forEach(u => {
        userMap.set(u.id, { id: u.id, username: u.username, referId: u.referId, childs: [] });
    });

    if (userMap.has(startId)) {
        const treeRoot = userMap.get(startId);
        userMap.forEach(user => {
            if (user.referId && userMap.has(user.referId) && user.id !== startId) {
                userMap.get(user.referId).childs.push(user);
            }
        });
        console.log("Tree root:", treeRoot.username);
        console.log("Children of root:", treeRoot.childs.length);
    } else {
        console.log("Root user not in map!");
    }
}

test().catch(console.error).finally(() => prisma.$disconnect());
