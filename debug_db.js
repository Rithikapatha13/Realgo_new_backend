
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
    const highways = await prisma.highway.findMany()
    const projects = await prisma.project.findMany()
    const plots = await prisma.plot.findMany({ take: 5 })

    console.log('--- DB DUMP ---')
    console.log('Highways:', JSON.stringify(highways, null, 2))
    console.log('Projects:', JSON.stringify(projects, null, 2))
    console.log('Plots (first 5):', JSON.stringify(plots, null, 2))
}

main()
    .catch(async (e) => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
