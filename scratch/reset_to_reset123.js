import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const phone = '2222222222';
  const newPassword = 'Reset@123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedAdmin = await prisma.admin.updateMany({
    where: { phone: phone },
    data: {
      password: hashedPassword,
      passwordChanged: true
    }
  });

  console.log('Update result:', updatedAdmin);
  await prisma.$disconnect();
}

main();
