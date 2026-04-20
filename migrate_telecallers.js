import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function migrate() {
  console.log('--- STARTING TELECALLER MIGRATION (DATA-SAFE) ---');

  // 1. Get all users with Role 'telecaller' (case-insensitive) from the User table
  const usersWithTCRole = await prisma.user.findMany({
    where: {
      role: {
        roleName: {
            equals: 'telecaller',
            mode: 'insensitive'
        }
      }
    },
    include: {
      role: true
    }
  });

  console.log(`Found ${usersWithTCRole.length} regular telecallers in the User table.`);

  for (const user of usersWithTCRole) {
    console.log(`Migrating User: ${user.username} (${user.id})...`);

    // Check if telecaller already exists
    let tc = await prisma.telecaller.findFirst({
        where: { phone: user.phone, companyId: user.companyId }
    });

    if (!tc) {
        tc = await prisma.telecaller.create({
            data: {
                username: user.username,
                firstName: user.firstName,
                lastName: user.lastName,
                fatherOrHusband: user.fatherOrHusband,
                gender: user.gender,
                bloodGroup: user.bloodGroup,
                position: user.position,
                income: user.income,
                academicQual: user.academicQual,
                languages: user.languages,
                maritalStatus: user.maritalStatus,
                spouseName: user.spouseName,
                spousePhone: user.spousePhone,
                image: user.image,
                dob: user.dob,
                phone: user.phone,
                email: user.email,
                password: user.password,
                aadharCard: user.aadharCard,
                aadharNo: user.aadharNo,
                panCard: user.panCard,
                panNo: user.panNo,
                nomineeName: user.nomineeName,
                nomineePhone: user.nomineePhone,
                nomineeRelation: user.nomineeRelation,
                addressLine: user.addressLine,
                landmark: user.landmark,
                pinCode: user.pinCode,
                city: user.city,
                state: user.state,
                country: user.country,
                alternativePhone: user.alternativePhone,
                bankName: user.bankName,
                branch: user.branch,
                accountHolder: user.accountHolder,
                bankAccountNo: user.bankAccountNo,
                ifsc: user.ifsc,
                referId: user.referId,
                createdById: user.createdById,
                companyId: user.companyId,
                roleId: user.roleId,
                userAuthId: user.userAuthId,
                teamHeadId: user.teamHeadId,
                reasonForReject: user.reasonForReject,
                status: user.status === 'VERIFIED' ? 'VERIFIED' : 'PENDING',
                passwordChanged: user.passwordChanged,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                availability: user.availability,
                isOnline: user.isOnline,
                mustChangePassword: user.mustChangePassword,
                lastLoginAt: user.lastLoginAt,
                lastActiveAt: user.lastActiveAt
            }
        });
        console.log(`  -> Created Telecaller record.`);
    }

    // Update Leads: Move data from legacy 'telecallerId' to new 'dedicatedTCId'
    const leadUpdate = await prisma.lead.updateMany({
      where: {
        telecallerId: user.id
      },
      data: {
        dedicatedTCId: tc.id
      }
    });
    console.log(`  -> Re-mapped ${leadUpdate.count} leads to dedicatedTCId.`);

    // Update CallLogs
    const logUpdate = await prisma.callLog.updateMany({
      where: {
        telecallerId: user.id
      },
      data: {
        dedicatedTCId: tc.id
      }
    });
    console.log(`  -> Re-mapped ${logUpdate.count} call logs to dedicatedTCId.`);
  }

  // 2. Handle "Telecaller Admin" role (case-insensitive)
  console.log('\nProcessing Telecaller Admins in Admin table...');
  const tcAdmins = await prisma.admin.findMany({
    where: {
      role: {
        roleName: {
            equals: 'Telecaller Admin',
            mode: 'insensitive'
        }
      }
    }
  });

  for (const admin of tcAdmins) {
    console.log(`Processing Admin TC: ${admin.username} (${admin.id})...`);
    
    // Check if any leads were pointed to this Admin via the old telecallerId (User relation)
    const leadUpdate = await prisma.lead.updateMany({
      where: {
        telecallerId: admin.id 
      },
      data: {
        adminTCId: admin.id
      }
    });
    console.log(`  -> Re-mapped ${leadUpdate.count} leads to adminTCId.`);
    
    const logUpdate = await prisma.callLog.updateMany({
        where: {
          telecallerId: admin.id
        },
        data: {
          adminTCId: admin.id
        }
      });
      console.log(`  -> Re-mapped ${logUpdate.count} call logs to adminTCId.`);
  }

  console.log('--- MIGRATION COMPLETE ---');
}

migrate()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
