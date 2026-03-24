
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const companyId = '951fd2ed-13e0-40a5-b47c-f4b43c82089d'; // Active company from my earlier check

    console.log('--- Seeding Highways ---');
    const highways = [
        { highwayName: 'Hyderabad - Warangal Highway', highwayIcon: 'icons/warangal.png' },
        { highwayName: 'Hyderabad - Vijayawada Highway', highwayIcon: 'icons/vijayawada.png' },
        { highwayName: 'Srisailam Highway', highwayIcon: 'icons/srisailam.png' },
        { highwayName: 'Bangalore Highway', highwayIcon: 'icons/bangalore.png' },
    ];

    for (const h of highways) {
        const highway = await prisma.highway.upsert({
            where: { id: h.id || 'placeholder-' + h.highwayName },
            update: {},
            create: {
                highwayName: h.highwayName,
                highwayIcon: h.highwayIcon,
                companyId: companyId,
            },
        });
        console.log(`Created Highway: ${highway.highwayName} (${highway.id})`);

        // Create a sample project for each highway
        console.log(`--- Seeding Project for ${h.highwayName} ---`);
        const project = await prisma.project.create({
            data: {
                projectName: `${h.highwayName.split(' ')[2] || h.highwayName.split(' ')[0]} Premium Venture`,
                projectDescription: `A beautiful gated community venture on ${h.highwayName}.`,
                projectAddress: `Near Regional Ring Road, ${h.highwayName}`,
                projectImage: 'projects/sample.jpg',
                companyId: companyId,
                highwayId: highway.id,
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
