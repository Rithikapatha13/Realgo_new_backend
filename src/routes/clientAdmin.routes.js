import authMiddleware from "../middlewares/auth.middleware.js";

export default async function clientAdminRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // Middleware to check if user is a Client Admin or Super Admin
    const isClientAdmin = async (req, reply) => {
        const userType = (req.user.userType || "").toLowerCase();
        const roleName = (req.user.role?.roleName || "").toUpperCase();

        const isSuperAdmin = userType === 'superadmin' || userType === 'super-admin' || roleName === 'SUPERADMIN';
        const isClientAdminRole = 
            userType === 'clientadmin' || 
            userType === 'companyadmin' || 
            userType === 'admin' ||
            roleName === 'COMPANY_ADMIN' || 
            roleName === 'CLIENT_ADMIN' ||
            roleName.includes('ADMIN');

        if (!isSuperAdmin && !isClientAdminRole) {
            return reply.code(403).send({ success: false, message: "Forbidden: Client Admin access required" });
        }
    };

    // GET /api/client-admin/dashboard-stats
    fastify.get("/dashboard-stats", { preHandler: [isClientAdmin] }, async (req, reply) => {
        try {
            const { companyId } = req.user;

            const [
                userCount,
                adminCount,
                projectCount,
                plotStats,
                transactionStats,
                recentLeads,
                subAdmins
            ] = await Promise.all([
                // 1. Total Users (Associates/Telecallers)
                prisma.user.count({ where: { companyId } }),

                // 2. Total Admins (including the Company Admin itself)
                prisma.admin.count({ where: { companyId } }),

                // 3. Total Projects
                prisma.project.count({ where: { companyId } }),

                // 4. Plot Stats by Status
                prisma.plot.groupBy({
                    by: ['status'],
                    where: { companyId },
                    _count: { _all: true }
                }),

                // 5. Transaction Summary (Last 30 days)
                prisma.transaction.aggregate({
                    where: { 
                        companyId,
                        transactionDate: { gte: new Date(new Date().setDate(new Date().getDate() - 30)) }
                    },
                    _sum: { totalAmount: true }
                }),

                // 6. Recent Activity (Leads)
                prisma.lead.findMany({
                    where: { companyId },
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    include: { user: { select: { username: true } } }
                }),

                // 7. Sub-Admins list for performance tracking
                prisma.admin.findMany({
                    where: { 
                        companyId, 
                        NOT: { 
                            role: { 
                                roleName: { in: ['COMPANY_ADMIN', 'CLIENT_ADMIN'] } 
                            } 
                        } 
                    },
                    include: { role: true }
                })
            ]);

            // Formatting Plot Stats
            const plots = {
                total: plotStats.reduce((acc, curr) => acc + curr._count._all, 0),
                available: plotStats.find(s => s.status === 'AVAILABLE')?._count._all || 0,
                booked: plotStats.find(s => s.status === 'BOOKED')?._count._all || 0,
                registered: plotStats.find(s => s.status === 'REGISTERED')?._count._all || 0,
            };

            // Calculate "Work" for each Department (Monetization)
            const subAdminPerformance = await Promise.all(subAdmins.map(async (admin) => {
               const roleName = admin.role.roleName.toUpperCase();
               let workCount = 0;
               let workLabel = "Actions";

               if (roleName === 'ACCOUNTS') {
                   // Count transactions created by ANY users with the ACCOUNTS role in this company
                   workCount = await prisma.transaction.count({ 
                       where: { 
                           companyId,
                           createdBy: { role: { roleName: 'ACCOUNTS' } } 
                       } 
                   });
                   workLabel = "Transactions Processed";
               } else if (roleName === 'TELECALLER') {
                   // Count leads created by ANY users with the TELECALLER role
                   workCount = await prisma.lead.count({ 
                       where: { 
                           companyId,
                           user: { role: { roleName: 'TELECALLER' } }
                       } 
                   });
                   workLabel = "Leads Generated";
               } else if (roleName === 'ASSOCIATE') {
                   // Count sales/bookings by ANY users with the ASSOCIATE role
                   workCount = await prisma.plot.count({ 
                       where: { 
                           companyId, 
                           status: { in: ['BOOKED', 'REGISTERED'] },
                           // Assuming associateId in Plot stores the User ID of the associate
                           associate: { role: { roleName: 'ASSOCIATE' } }
                       } 
                   });
                   workLabel = "Sales Closed";
               }

               return {
                   id: admin.id,
                   name: `${admin.firstName} ${admin.lastName || ''}`,
                   role: admin.role.displayName,
                   workCount,
                   workLabel,
                   status: admin.status
               };
            }));

            return reply.send({
                success: true,
                data: {
                    summary: {
                        totalUsers: userCount,
                        totalAdmins: adminCount,
                        totalProjects: projectCount,
                        plots,
                        totalRevenue30Days: transactionStats._sum.totalAmount || 0
                    },
                    recentLeads,
                    subAdminPerformance
                }
            });

        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });
}
