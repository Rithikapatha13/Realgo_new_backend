
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companyId = '951fd2ed-13e0-40a5-b47c-f4b43c82089d'; // Active company from my earlier check

    console.log('--- Seeding Project Statuses ---');
    const statuses = [
        { statusName: 'Launched', statusIcon: 'icons/launched.png' },
        { statusName: 'Under Construction', statusIcon: 'icons/construction.png' },
        { statusName: 'Completed', statusIcon: 'icons/completed.png' },
        { statusName: 'Sold Out', statusIcon: 'icons/soldout.png' },
    ];

    for (const s of statuses) {
        const status = await prisma.projectStatus.upsert({
            where: { id: s.id || 'placeholder-' + s.statusName },
            update: {},
            create: {
                statusName: s.statusName,
                statusIcon: s.statusIcon,
                companyId: companyId,
            },
        });
        console.log(`Created Project Status: ${status.statusName} (${status.id})`);

        // Create a sample project for each status
        console.log(`--- Seeding Project for ${s.statusName} ---`);
        const project = await prisma.project.create({
            data: {
                projectName: `${s.statusName} Premium Venture`,
                projectDescription: `A beautiful gated community venture in ${s.statusName} stage.`,
                projectAddress: `Near Regional Ring Road, Development Zone`,
                projectImage: 'projects/sample.jpg',
                companyId: companyId,
                projectStatusId: status.id,
            },
        });
        console.log(`Created Project: ${project.projectName} (${project.id})`);

        // Create some available plots for the project
        console.log(`--- Seeding Plots for ${project.projectName} ---`);
        for (let i = 1; i <= 5; i++) {
            await prisma.plot.create({
                data: {
                    plotNumber: `P-${i}`,
                    projectName: project.projectName,
                    projectId: project.id,
                    sqrYards: 200,
                    plotCategory: 'Residential',
                    status: 'AVAILABLE',
                    companyId: companyId
                }
            });
        }
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
