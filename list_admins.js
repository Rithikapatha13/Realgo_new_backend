
import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
p.admin.findMany({ where: { companyId: '4bfd807c-7ad8-457b-bee5-9d39dc10e980' } })
    .then(a => console.log(JSON.stringify(a, null, 2)))
    .finally(() => p.$disconnect());
