import authMiddleware from "../middlewares/auth.middleware.js";

export async function reportRoutes(fastify) {
    // Helper to count nodes
    const countAllNodes = (nodes) => {
        let count = nodes.length;
        nodes.forEach((node) => {
            if (node.childs) {
                count += countAllNodes(node.childs);
            }
        });
        return count;
    };

    fastify.get("/report-users", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const companyId = req.user.companyId;
            let { active, userId, designation, startDate, endDate } = req.query;

            // Determine the user ID for filtering
            if (userId === 'all') {
                if (['admin', 'accounts', 'pro', 'superAdmin'].includes(req.user.role?.roleName)) {
                    userId = null;
                } else {
                    userId = req.user.id;
                }
            }

            // Check if the target user is a company user
            let isCompanyUser = false;
            if (userId) {
                const targetUser = await fastify.prisma.user.findFirst({
                    where: { id: userId, companyId: companyId, username: 'company' }
                });
                if (targetUser) {
                    isCompanyUser = true;
                }
            }

            let users;
            if (isCompanyUser && userId) {
                // For company user, only get first level users (direct children)
                users = await fastify.prisma.$queryRawUnsafe(`
                  SELECT 
                    u.id, 
                    u."referId", 
                    u."teamHeadId",
                    u.username as name, 
                    u."userAuthId", 
                    u.status, 
                    u.phone, 
                    u.image as image, 
                    u."roleId", 
                    u."createdAt" as "joining_date",
                    r.username as "referrer_name"
                  FROM "User" u
                  LEFT JOIN "User" r ON u."referId" = r.id
                  WHERE u."companyId" = $1 AND u."referId" = $2
                `, companyId, userId);
            } else {
                let conditionStr = `WHERE "companyId" = $1`;
                let params = [companyId];
                if (userId) {
                    conditionStr += ` AND id = $2`;
                    params.push(userId);
                }

                const query = `
                  WITH RECURSIVE children AS (
                    SELECT id, "referId", "teamHeadId", username, image, phone, status, "roleId", "userAuthId", "createdAt" as "joining_date"
                    FROM "User" ${conditionStr}
                    UNION
                    SELECT tp.id, tp."referId", tp."teamHeadId", tp.username, tp.image, tp.phone, tp.status, tp."roleId", tp."userAuthId", tp."createdAt"
                    FROM "User" tp
                    JOIN children c ON tp."referId" = c.id
                  )
                  SELECT 
                      c.id, 
                      c."referId", 
                      c."teamHeadId",
                      c.username as name, 
                      c."userAuthId", 
                      c.status, 
                      c.phone, 
                      c.image as image, 
                      c."roleId", 
                      c."joining_date",
                      r.username as "referrer_name"
                  FROM children c
                  LEFT JOIN "User" r ON c."referId" = r.id;
                `;
                users = await fastify.prisma.$queryRawUnsafe(query, ...params);
            }

            // Map roles
            const rolesData = await fastify.prisma.role.findMany({
                where: { companyId },
                orderBy: { roleNo: "asc" },
            });
            const roleMap = new Map();
            rolesData.forEach(role => roleMap.set(role.id, role));

            let filteredUsers = users.map(u => ({
                ...u,
                title: roleMap.get(u.roleId)?.roleName || null,
                roleValue: roleMap.get(u.roleId)?.roleNo || 0
            }));

            // In-memory filters
            if (active && active !== 'ALL') {
                filteredUsers = filteredUsers.filter((user) => user.status === active);
            }
            if (designation) {
                // designation is passed as roleId currently
                filteredUsers = filteredUsers.filter((user) => user.roleId === designation);
            }
            if (startDate) {
                filteredUsers = filteredUsers.filter((user) => new Date(user.joining_date) >= new Date(startDate));
            }
            if (endDate) {
                filteredUsers = filteredUsers.filter((user) => new Date(user.joining_date) <= new Date(endDate));
            }

            const sortByRole = (arr) => arr.sort((a, b) => a.roleValue - b.roleValue);
            const removeFields = (arr) => arr.map(({ id, roleId, roleValue, image, ...rest }) => rest);

            const isFilterApplied = userId || active || designation || startDate || endDate;

            if (isFilterApplied || isCompanyUser) {
                const flat = filteredUsers.map((user) => ({
                    ...user,
                    joining_date: new Date(user.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
                }));
                const sortedFlatData = sortByRole(flat);
                const sanitizedFlatData = removeFields(sortedFlatData);
                const totalCount = countAllNodes(sortedFlatData);

                return {
                    success: true,
                    items: sanitizedFlatData,
                    totalCount: totalCount,
                    message: isCompanyUser ? 'First level users for company' : 'Filtered users',
                    status: 200,
                };
            }

            // Create tree structure
            const root = [];
            const flat = filteredUsers.map((user) => ({
                ...user,
                joining_date: new Date(user.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }));

            for (const node of flat) {
                if (node.referId === userId) {
                    root.push(node);
                } else {
                    const parentIndex = flat.findIndex((el) => el.id === node.referId);
                    if (flat[parentIndex]) {
                        if (!flat[parentIndex].childs) {
                            flat[parentIndex].childs = [node];
                        } else {
                            flat[parentIndex].childs.push(node);
                        }
                    } else {
                        // Orphan nodes push to root if parent not found in filtered list
                        root.push(node);
                    }
                }
            }

            const sortTreeByRole = (nodes) => {
                return nodes
                    .map((node) => {
                        if (node.childs) {
                            node.childs = sortTreeByRole(node.childs);
                        }
                        return node;
                    })
                    .sort((a, b) => {
                        if (a.roleValue === b.roleValue) {
                            const aid = a.userAuthId || '';
                            const bid = b.userAuthId || '';
                            return aid.localeCompare(bid);
                        }
                        return a.roleValue - b.roleValue;
                    });
            };

            const sortedRoot = sortTreeByRole(root);
            const sanitizedRoot = removeFields(sortedRoot);
            const totalCount = countAllNodes(sortedRoot);

            return {
                success: true,
                items: sanitizedRoot,
                totalCount: totalCount,
                message: 'Users',
                status: 200,
            };

        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Server error" });
        }
    });

    fastify.get("/report-company-linked-users", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const companyId = req.user.companyId;
            let { active, designation, startDate, endDate } = req.query;

            const companyUser = await fastify.prisma.user.findFirst({
                where: { username: 'company', companyId: companyId },
            });
            if (!companyUser) {
                return res.code(404).send({ success: false, message: "Company user not found", status: 404 });
            }

            const users = await fastify.prisma.$queryRawUnsafe(`
              SELECT 
                u.id,
                u."referId",
                u."teamHeadId",
                u.username as name,
                u."userAuthId",
                u.status,
                u.phone,
                u.image as image,
                u."roleId",
                u."createdAt" as "joining_date",
                r.username as "referrer_name"
              FROM "User" u
              LEFT JOIN "User" r ON u."referId" = r.id
              WHERE u."companyId" = $1 AND u."referId" = $2
            `, companyId, companyUser.id);

            const rolesData = await fastify.prisma.role.findMany({
                where: { companyId },
                orderBy: { roleNo: "asc" },
            });
            const roleMap = new Map();
            rolesData.forEach((role) => roleMap.set(role.id, role));

            let filteredUsers = users.map(u => ({
                ...u,
                title: roleMap.get(u.roleId)?.roleName || null,
                roleValue: roleMap.get(u.roleId)?.roleNo || 0
            }));

            // Apply in-memory filters
            if (active && active !== 'ALL') {
                filteredUsers = filteredUsers.filter((u) => u.status === active);
            }
            if (designation) {
                filteredUsers = filteredUsers.filter((u) => u.roleId === designation);
            }
            if (startDate) {
                filteredUsers = filteredUsers.filter((u) => new Date(u.joining_date) >= new Date(startDate));
            }
            if (endDate) {
                filteredUsers = filteredUsers.filter((u) => new Date(u.joining_date) <= new Date(endDate));
            }

            const flat = filteredUsers.map((user) => ({
                ...user,
                joining_date: new Date(user.joining_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            }));

            const sortByRole = (arr) => arr.sort((a, b) => a.roleValue - b.roleValue);
            const removeFields = (arr) => arr.map(({ id, roleId, roleValue, image, ...rest }) => rest);

            const sorted = sortByRole(flat);
            const sanitized = removeFields(sorted);

            return {
                success: true,
                items: sanitized,
                totalCount: sanitized.length,
                message: 'Company-linked users report',
                status: 200,
            };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Server error", status: 500 });
        }
    });

    fastify.get("/report-available-plots", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const companyId = req.user.companyId;
            const { project, status, startDate, endDate } = req.query;

            let condition = { companyId };
            if (project) {
                condition.projectId = project; // Client usually sends projectId
            }
            if (status && status !== 'all') {
                condition.status = status;
            }
            if (startDate && endDate) {
                condition.updatedAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                };
            }

            const plots = await fastify.prisma.plot.findMany({
                where: condition,
                include: {
                    project: { select: { projectName: true } }
                }
            });

            // Replicate raw sql parsing for order
            plots.sort((a, b) => {
                const aNum = parseInt(a.plotNumber.split(',')[0]) || 0;
                const bNum = parseInt(b.plotNumber.split(',')[0]) || 0;
                return aNum - bNum;
            });

            const associateIds = [...new Set(plots.map(p => p.associateId).filter(Boolean))];
            const teamHeadIds = [...new Set(plots.map(p => p.teamHeadId).filter(Boolean))];

            const users = await fastify.prisma.user.findMany({
                where: { id: { in: [...associateIds, ...teamHeadIds] } },
                select: { id: true, username: true }
            });
            const userMap = users.reduce((acc, u) => {
                acc[u.id] = u.username;
                return acc;
            }, {});

            const isAdmin = req.user.role?.roleName === 'admin' || req.user.role?.roleName === 'superAdmin';

            const response = plots.map(plot => {
                const obj = {
                    name: plot.project?.projectName,
                    "plot number": plot.plotNumber,
                    facing: plot.facing,
                    size: plot.sqrYards,
                    "plot category": plot.plotCategory,
                    status: plot.status,
                };

                if (isAdmin) {
                    obj.booking_date = plot.bookingDate ? new Date(plot.bookingDate).toLocaleDateString() : null;
                    obj.customer_name = plot.customerName;

                    if (plot.status === 'BOOKED' || plot.status === 'REGISTERED') {
                        obj.associate_name = userMap[plot.associateId] || null;
                        obj.team_head_name = userMap[plot.teamHeadId] || null;
                    }
                }

                return obj;
            });

            return { success: true, status: 200, items: response };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "server error", status: 500 });
        }
    });

    fastify.get("/report-sales", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const companyId = req.user.companyId;
            const { project, status, id, startDate, endDate, teamHeadId } = req.query;
            let condition = { companyId };

            if (status && status !== 'all') {
                condition.status = status;
            } else {
                condition.status = { in: ['BOOKED', 'REGISTERED'] };
            }

            if (id) {
                condition.associateId = id;
            }
            if (teamHeadId) {
                condition.teamHeadId = teamHeadId;
            }
            if (project) {
                condition.projectId = project;
            }
            if (startDate && endDate) {
                condition.updatedAt = {
                    gte: new Date(startDate),
                    lte: new Date(endDate),
                };
            }

            const soldPlots = await fastify.prisma.plot.findMany({
                where: condition,
                include: {
                    project: { select: { projectName: true } }
                },
                orderBy: { updatedAt: "asc" }
            });

            const associateIds = [...new Set(soldPlots.map(p => p.associateId).filter(Boolean))];
            const teamHeadIds = [...new Set(soldPlots.map(p => p.teamHeadId).filter(Boolean))];

            const users = await fastify.prisma.user.findMany({
                where: { id: { in: [...associateIds, ...teamHeadIds] } },
                select: { id: true, username: true }
            });
            const userMap = users.reduce((acc, u) => {
                acc[u.id] = u.username;
                return acc;
            }, {});

            const formattedPlots = soldPlots.map(plot => {
                const isRegistered = plot.status === 'REGISTERED';
                const dateRaw = isRegistered ? plot.registeredDate : plot.bookingDate;

                return {
                    projectName: plot.project?.projectName,
                    plotNumber: plot.plotNumber,
                    facing: plot.facing,
                    sqrYards: plot.sqrYards,
                    status: plot.status,
                    customerName: plot.customerName,
                    customerPhone: plot.customerContact,
                    name: userMap[plot.associateId] || null,
                    teamHeadName: userMap[plot.teamHeadId] || null,
                    date: dateRaw ? new Date(dateRaw).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : null,
                };
            });

            return { success: true, items: formattedPlots, status: 200, message: "Plots By Role" };

        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "server error", status: 500 });
        }
    });

}
