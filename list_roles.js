
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.role.findMany({ where: { companyId: '4bfd807c-7ad8-457b-bee5-9d39dc10e980' } })
    .then(r => console.log(JSON.stringify(r, null, 2)))
    .finally(() => p.$disconnect());
