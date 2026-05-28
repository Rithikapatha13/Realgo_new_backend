const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
    console.log("Marking all active telecallers and users as online...");
    
    const tcs = await prisma.telecaller.updateMany({
        where: { status: "VERIFIED" },
        data: { isOnline: true }
    });
    
    const users = await prisma.user.updateMany({
        where: { status: "VERIFIED" },
        data: { isOnline: true }
    });
    
    console.log(`Updated ${tcs.count} telecallers and ${users.count} users.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
