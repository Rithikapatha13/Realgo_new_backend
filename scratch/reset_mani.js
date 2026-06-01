import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const phone = '2222222222';
  const newPassword = 'Realgo@123';
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  const updatedAdmin = await prisma.admin.updateMany({
    where: { phone: phone, companyId: 'e630520d-7876-4552-a38b-34b1a04eac93' }, // cisco
    data: {
      password: hashedPassword,
      passwordChanged: false // Reset so they are prompted or can login as a fresh user
    }
  });

  console.log('Update result:', updatedAdmin);
  await prisma.$disconnect();
}

main();
