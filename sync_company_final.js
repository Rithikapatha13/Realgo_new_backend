
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const targetCompanyId = '33f1cc90-26a6-4f72-a5e1-58d6ef5ab51e';
    console.log(`Targeting Company ID: ${targetCompanyId}`);

    // Update all highways and projects that have a different companyId
    const hUpdate = await prisma.highway.updateMany({
        where: { NOT: { companyId: targetCompanyId } },
        data: { companyId: targetCompanyId }
    });
    console.log(`Updated ${hUpdate.count} highways`);

    const pUpdate = await prisma.project.updateMany({
        where: { NOT: { companyId: targetCompanyId } },
        data: { companyId: targetCompanyId }
    });
    console.log(`Updated ${pUpdate.count} projects`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
