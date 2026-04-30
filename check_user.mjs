import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const user = await prisma.user.findFirst({
        where: { username: { contains: 'Vanisree', mode: 'insensitive' } },
        include: { company: true, role: true }
    });
    if (user) {
        console.log('User found:', user.username);
        console.log('Company:', user.company?.company);
        console.log('Company Modules:', user.company?.modules);
        console.log('Role Modules:', user.role?.modules);
    } else {
        console.log('User not found');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
