import authMiddleware from "../middlewares/auth.middleware.js";
import { getAllSubordinateIds } from "../utils/hierarchy.js";

export default async function performanceRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // GET /api/performance/stats
    fastify.get("/stats", async (req, reply) => {
        try {
            if (!req.user) {
              console.error("DEBUG: req.user is missing");
              return reply.code(401).send({ success: false, message: "Unauthorized" });
            }

            const companyId = req.user.companyId;
            if (!companyId) {
                console.error("DEBUG: companyId is missing for user", req.user);
                return reply.code(400).send({ success: false, message: "Company ID is missing in user session" });
            }

            const roleNo = req.user.roleNo ?? 999;
            const roleName = (req.user.role?.roleName || req.user.role_name || "").toUpperCase();
            const isPowerRole = req.user.userType === 'clientadmin' || roleName === 'ADMIN' || roleNo <= 4;

            let filterUserIds = [];
            if (!isPowerRole) {
                const subordinateIds = await getAllSubordinateIds(prisma, req.user.userId, companyId);
                filterUserIds = [...subordinateIds, req.user.userId];
            }

            const last30Days = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

            console.log(`DEBUG: Fetching performance stats for company: ${companyId}, isPowerRole: ${isPowerRole}`);

            const [
                transactions,
                callLogs,
                meetings,
                requests
            ] = await Promise.all([
                // 1. Accounts Performance (Transactions)
                prisma.transaction.findMany({
                    where: { 
                        companyId, 
                        transactionDate: { gte: last30Days },
                        ...(!isPowerRole ? { createdById: { in: filterUserIds } } : {})
                    },
                }),

                // 2. Telecaller Performance (Call Logs)
                prisma.callLog.findMany({
                    where: { 
                        createdAt: { gte: last30Days }, 
                        lead: { companyId },
                        ...(!isPowerRole ? { telecallerId: { in: filterUserIds } } : {})
                    },
                    select: { status: true }
                }),

                // 3. Associate Performance (Meetings/Bookings)
                prisma.meeting.findMany({
                    where: { 
                        createdAt: { gte: last30Days }, 
                        lead: { companyId },
                        ...(!isPowerRole ? { associateId: { in: filterUserIds } } : {})
                    },
                    select: { outcome: true }
                }),

                // 4. Admin Performance (Requests)
                prisma.request.findMany({
                    where: { 
                        createdAt: { gte: last30Days }, 
                        user: { companyId },
                        ...(!isPowerRole ? { requestedById: { in: filterUserIds } } : {})
                    },
                    select: { status: true }
                })
            ]);

            // Helper to aggregate counts
            const getCounts = (items, key) => {
                const counts = items.reduce((acc, item) => {
                    const val = item[key] || 'UNKNOWN';
                    acc[val] = (acc[val] || 0) + 1;
                    return acc;
                }, {});
                return Object.entries(counts).map(([label, count]) => ({ [key === 'outcome' ? 'outcome' : 'status']: label, count }));
            };

            // Aggregate Transaction Summary
            const accountSummary = transactions.reduce((acc, t) => {
                const type = t.transactionType || 'UNKNOWN';
                if (!acc[type]) acc[type] = { type, total: 0, count: 0 };
                acc[type].total += (t.totalAmount || 0);
                acc[type].count += 1;
                return acc;
            }, {});

            // Aggregate Daily Trend
            const trendMap = transactions.reduce((acc, t) => {
                if (t.transactionDate) {
                   const date = t.transactionDate.toISOString().split('T')[0];
                   acc[date] = (acc[date] || 0) + (t.totalAmount || 0);
                }
                return acc;
            }, {});

            const trend = Object.entries(trendMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, amount]) => ({ date, amount }));

            return reply.send({
                success: true,
                data: {
                    accounts: {
                        summary: Object.values(accountSummary),
                        trend: trend
                    },
                    telecaller: {
                        summary: getCounts(callLogs, 'status')
                    },
                    associate: {
                        summary: getCounts(meetings, 'outcome')
                    },
                    admin: {
                        summary: getCounts(requests, 'status')
                    }
                }
            });
        } catch (err) {
            console.error("CRITICAL PERFORMANCE ROUTE ERROR:", err);
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error", error: err.message, stack: err.stack });
        }
    });

    // GET /api/performance/module/:moduleName
    // More detailed module-specific performance if needed
}
