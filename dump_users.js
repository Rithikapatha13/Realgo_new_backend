import { PrismaClient } from '@prisma/client';
import fs from 'fs';
const prisma = new PrismaClient();

async function checkUsers() {
    try {
        const users = await prisma.user.findMany({
            select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
                referId: true,
                companyId: true,
                role: { select: { roleName: true } }
            }
        });

        const admins = await prisma.admin.findMany({
            select: {
                id: true,
                username: true,
                companyId: true,
            }
        });

        const data = {
            users,
            admins
        };

        fs.writeFileSync('user_dump.json', JSON.stringify(data, null, 2));
        console.log('Dump written to user_dump.json');

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

checkUsers();