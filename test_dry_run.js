import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('--- STARTING BULK UPLOAD DRY RUN ---');
  
  // 1. Get valid context
  const company = await prisma.company.findFirst();
  const user = await prisma.user.findFirst({ where: { companyId: company.id } });
  
  if (!company || !user) {
    console.error('Could not find a valid company or user for testing.');
    return;
  }

  console.log(`Context: Company [${company.company}], User [${user.firstName}]`);

  // 2. Mock Leads data (as if from Excel)
  const testLeads = [
    { Name: 'Test Lead 1', Phone: '9999999901', City: 'Hyderabad', Source: 'TEST_DRY_RUN' },
    { Name: 'Test Lead 2', Phone: '9999999902', City: 'Bangalore', Source: 'TEST_DRY_RUN' },
    { Name: 'Test Lead 3', Phone: '9999999903', City: 'Mumbai', Source: 'TEST_DRY_RUN' }
  ];

  const createdIds = [];

  try {
    console.log('\nProcessing leads...');
    for (const row of testLeads) {
      const lead = await prisma.lead.create({
        data: {
          leadName: row.Name,
          leadContact: row.Phone,
          leadCity: row.City,
          leadSource: row.Source,
          leadStatus: 'NEW',
          description: 'Dry Run Test Instance',
          companyId: company.id,
          userId: user.id,
          date: new Date()
        }
      });
      createdIds.push(lead.id);
      console.log(`- Created: ${lead.leadName} (${lead.id})`);
    }

    console.log('\n✅ SIMULATION SUCCESSFUL: All leads were correctly accepted by the database schema.');
    
  } catch (err) {
    console.error('\n❌ SIMULATION FAILED:', err.message);
  } finally {
    console.log('\n--- CLEANING UP ---');
    if (createdIds.length > 0) {
      await prisma.lead.deleteMany({
        where: { id: { in: createdIds } }
      });
      console.log(`- Removed ${createdIds.length} test records. Database is clean.`);
    }
    await prisma.$disconnect();
  }
}

main();
