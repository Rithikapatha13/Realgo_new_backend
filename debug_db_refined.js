
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const highways = await prisma.highway.findMany({ select: { companyId: true, highwayName: true } })
    const projects = await prisma.project.findMany({ select: { companyId: true, projectName: true } })

    const highwayCompanies = [...new Set(highways.map(h => h.companyId))]
    const projectCompanies = [...new Set(projects.map(p => p.companyId))]

    console.log('Unique Company IDs in Highways:', highwayCompanies)
    console.log('Unique Company IDs in Projects:', projectCompanies)

    if (highways.length > 0) console.log('Sample Highway Name:', highways[0].highwayName)
    if (projects.length > 0) console.log('Sample Project Name:', projects[0].projectName)
}

main()
    .catch(async (e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
