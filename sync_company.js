
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const currentAdminPhone = '9848022338'; // Using one of the admin phones I saw
    const admin = await prisma.admin.findFirst({ where: { phone: currentAdminPhone } });

    if (!admin) {
        console.log('Admin not found');
        return;
    }

    const targetCompanyId = admin.companyId;
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
