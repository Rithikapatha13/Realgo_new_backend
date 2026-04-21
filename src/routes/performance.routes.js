import authMiddleware from "../middlewares/auth.middleware.js";
import { getAllSubordinateIds } from "../utils/hierarchy.js";

export default async function performanceRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/performance/stats
    // General performance dashboard - accounts, telecaller, associate, admin
    // ─────────────────────────────────────────────────────────────────────
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
                        ...(!isPowerRole
                            ? {
                                OR: [
                                    { telecallerId:  { in: filterUserIds } },
                                    { dedicatedTCId: { in: filterUserIds } },
                                    { adminTCId:     { in: filterUserIds } },
                                ]
                              }
                            : {})
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
                const type = (t.transactionType || 'UNKNOWN').toUpperCase();
                if (!acc[type]) acc[type] = { type, total: 0, count: 0 };
                acc[type].total += (t.totalAmount || 0);
                acc[type].count += 1;
                return acc;
            }, {});

            // Aggregate Daily Trend
            const trendMap = transactions.reduce((acc, t) => {
                if (t.transactionDate && t.transactionDate instanceof Date) {
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

    // ─────────────────────────────────────────────────────────────────────
    // GET /api/performance/telecaller
    // Role-aware telecaller performance:
    //   • Telecaller (user)    → only their own call logs
    //   • Telecaller Admin     → all telecallers in the company
    //   • Company Admin/Admin  → all telecallers in the company
    //
    // Query params: telecallerId?, startDate?, endDate?
    // ─────────────────────────────────────────────────────────────────────
    fastify.get("/telecaller", async (req, reply) => {
        try {
            if (!req.user) {
                return reply.code(401).send({ success: false, message: "Unauthorized" });
            }

            const companyId = req.user.companyId;
            if (!companyId) {
                return reply.code(400).send({ success: false, message: "Company ID missing" });
            }

            const roleRaw = (req.user.role?.roleName || req.user.role_name || "").toLowerCase().replace(/[\s_-]/g, "");
            const uType   = (req.user.userType || "").toLowerCase().replace(/[\s_-]/g, "");
            const userId  = req.user.userId || req.user.id;

            // Determine if this user can see all telecallers
            const isAdmin =
                ["admin", "marketingadmin", "companyadmin", "clientadmin", "superadmin"].includes(roleRaw) ||
                roleRaw === "telecalleradmin" ||
                (roleRaw === "telecaller" && uType === "admin");

            const { telecallerId, startDate, endDate } = req.query;

            // Build date filter
            const dateFilter = {};
            if (startDate) dateFilter.gte = new Date(startDate);
            if (endDate)   dateFilter.lte = new Date(new Date(endDate).setHours(23, 59, 59, 999));
            const hasDateFilter = Object.keys(dateFilter).length > 0;

            // Build OR filter across all three telecaller ID fields in CallLog
            const buildTCFilter = (ids) => ({
                OR: [
                    { telecallerId:  { in: ids } },
                    { dedicatedTCId: { in: ids } },
                    { adminTCId:     { in: ids } },
                ]
            });

            // Determine scope
            let scopeFilter = {};
            if (!isAdmin) {
                // Regular telecaller → only their own logs
                scopeFilter = buildTCFilter([userId]);
            } else if (telecallerId && telecallerId !== "all" && telecallerId !== "") {
                // Admin filtered to a specific telecaller
                scopeFilter = buildTCFilter([telecallerId]);
            }
            // else: admin with no filter → no scope restriction (sees all)

            // Fetch call logs
            const whereCallLog = {
                lead: { companyId },
                ...(hasDateFilter ? { createdAt: dateFilter } : {}),
                ...scopeFilter,
            };

            const callLogs = await prisma.callLog.findMany({
                where: whereCallLog,
                include: {
                    lead: {
                        select: { leadName: true, leadContact: true },
                    },
                    // Legacy User-based telecaller
                    telecaller: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                    // Dedicated Telecaller table
                    dedicatedTC: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                    // Admin acting as telecaller
                    adminTC: {
                        select: { id: true, username: true, firstName: true, lastName: true },
                    },
                },
                orderBy: { createdAt: "desc" },
                take: 500,
            });

            // Extract caller name & id (prefer dedicatedTC, then User legacy, then Admin)
            const getCallerInfo = (log) => {
                const caller = log.dedicatedTC || log.telecaller || log.adminTC;
                const callerId = log.dedicatedTCId || log.telecallerId || log.adminTCId || "unknown";
                const name = caller
                    ? (`${caller.firstName || ""} ${caller.lastName || ""}`.trim() || caller.username)
                    : "Unknown";
                return { callerId, name };
            };

            // Aggregate status summary (overall)
            const statusCounts = {};
            callLogs.forEach((log) => {
                const s = log.status || "UNKNOWN";
                statusCounts[s] = (statusCounts[s] || 0) + 1;
            });
            const summary = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

            // Per-telecaller breakdown (admin only)
            let telecallers = [];
            if (isAdmin) {
                const tcMap = {};
                callLogs.forEach((log) => {
                    const { callerId, name } = getCallerInfo(log);
                    if (!tcMap[callerId]) {
                        tcMap[callerId] = {
                            id: callerId, name,
                            total: 0, answered: 0, interested: 0, followUp: 0, notAnswered: 0,
                        };
                    }
                    tcMap[callerId].total += 1;
                    const s = (log.status || "").toUpperCase();
                    if (s === "ANSWERED")     tcMap[callerId].answered    += 1;
                    if (s === "INTERESTED")   tcMap[callerId].interested  += 1;
                    if (s === "FOLLOW_UP")    tcMap[callerId].followUp    += 1;
                    if (s === "NOT_ANSWERED") tcMap[callerId].notAnswered += 1;
                });
                telecallers = Object.values(tcMap).sort((a, b) => b.total - a.total);
            }

            // Flatten call logs for table view
            const flatCallLogs = callLogs.map((log) => {
                const { name: telecallerName } = getCallerInfo(log);
                return {
                    id:             log.id,
                    telecallerName,
                    leadName:       log.lead?.leadName    || "—",
                    phone:          log.lead?.leadContact || "—",
                    status:         log.status,
                    notes:          log.notes,
                    createdAt:      log.createdAt,
                };
            });

            return reply.send({
                success: true,
                data: { summary, telecallers, callLogs: flatCallLogs },
            });
        } catch (err) {
            fastify.log.error(err);
            return reply
                .code(500)
                .send({ success: false, message: "Internal server error", error: err.message });
        }
    });
}
