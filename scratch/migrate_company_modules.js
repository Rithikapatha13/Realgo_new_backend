import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const companies = await prisma.company.findMany();

  console.log(`Processing ${companies.length} companies...`);

  for (const company of companies) {
    const modulesSet = new Set(company.modules);

    // 1. If has LEADS or FOLLOWUP, add CRM
    if (modulesSet.has('LEADS') || modulesSet.has('FOLLOWUP')) {
      modulesSet.add('CRM');
    }

    // 2. If has SITEVISITS or CUSTOMER SITEVISITS or VEHICLE SITEVISITS, add SITE_VISITS
    if (modulesSet.has('SITEVISITS') || modulesSet.has('CUSTOMER SITEVISITS') || modulesSet.has('VEHICLE SITEVISITS')) {
      modulesSet.add('SITE_VISITS');
    }

    // 3. If has GREETINGS or NEWS or VIDEOS or SHOWCASE, add MEDIA
    if (modulesSet.has('GREETINGS') || modulesSet.has('NEWS') || modulesSet.has('VIDEOS') || modulesSet.has('SHOWCASE')) {
      modulesSet.add('MEDIA');
    }

    // 4. If has ACCOUNTS, add FINANCE
    if (modulesSet.has('ACCOUNTS')) {
      modulesSet.add('FINANCE');
    }

    // 5. If has ADMIN or USER or ROLES, add ADMINISTRATION
    if (modulesSet.has('ADMIN') || modulesSet.has('USER') || modulesSet.has('ROLES')) {
      modulesSet.add('ADMINISTRATION');
    }

    const updatedModules = Array.from(modulesSet);

    if (updatedModules.length !== company.modules.length) {
      await prisma.company.update({
        where: { id: company.id },
        data: { modules: updatedModules }
      });
      console.log(`Updated company: ${company.company}`);
      console.log('  Old:', company.modules);
      console.log('  New:', updatedModules);
    } else {
      console.log(`No changes for company: ${company.company}`);
    }
  }

  await prisma.$disconnect();
}

main().catch(e => console.error(e));
