import authMiddleware from '../middlewares/auth.middleware.js';

// ── Helper: recursively get all descendant user IDs ──────────────────────────
async function getAllSubordinateIds(prisma, userId, status, companyId) {
    const subs = await prisma.user.findMany({
        where: {
            referId: userId,
            companyId,
            ...(status ? { status } : {})
        },
        select: { id: true }
    });

    let ids = subs.map(s => s.id);
    for (const sub of subs) {
        const childIds = await getAllSubordinateIds(prisma, sub.id, status, companyId);
        ids = ids.concat(childIds);
    }
    return ids;
}

// ── Route plugin ──────────────────────────────────────────────────────────────
export default async function teamRoutes(fastify) {
    const prisma = fastify.prisma;

    // ── GET /associates-tree ──────────────────────────────────────────────────
    fastify.get('/associates-tree', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id, status, roleId } = request.query;
            const companyId = request.user.companyId;

            console.log(`[DEBUG] /associates-tree: userType=${request.user.userType}, companyId=${companyId}, queryId=${id}`);

            const roleName = typeof request.user.role === 'string'
                ? request.user.role
                : request.user.role?.roleName;

            const isAdmin =
                request.user.userType?.toLowerCase() === 'admin' ||
                roleName?.toLowerCase() === 'admin';

            console.log(`[DEBUG] isAdmin=${isAdmin}, roleName=${roleName}`);

            let startId = id || request.user.userId;

            // If Admin and no specific ID requested, start from the 'company' root user
            if (isAdmin && !id) {
                console.log(`[DEBUG] Admin detected without ID, searching for 'company' root user...`);
                const companyUser = await prisma.user.findFirst({
                    where: { username: 'company', companyId }
                });
                if (companyUser) {
                    startId = companyUser.id;
                    console.log(`[DEBUG] Found 'company' root user: ${startId}`);
                } else {
                    console.warn(`[DEBUG] WARNING: No 'company' root user found for companyId=${companyId}`);
                }
            }

            // Fetch the root user for the tree
            const mainUser = await prisma.user.findUnique({
                where: { id: startId },
                include: { role: true }
            });

            if (!mainUser) {
                console.error(`[DEBUG] Main user with ID ${startId} not found in User table.`);
                return reply.send({ success: true, data: [], totalCount: 0 });
            }

            console.log(`[DEBUG] Building tree starting from user: ${mainUser.username} (${mainUser.id})`);

            // Fetch ALL users for this company to build the tree in memory (much faster than recursion)
            const allUsers = await prisma.user.findMany({
                where: {
                    companyId,
                    ...(status ? { status } : {}),
                    ...(roleId ? { roleId } : {})
                },
                include: { role: true }
            });

            console.log(`[DEBUG] Fetched ${allUsers.length} users for company ${companyId}`);

            // Build map of users for efficient lookup
            const userMap = new Map();
            allUsers.forEach(u => {
                userMap.set(u.id, {
                    id: u.id,
                    username: u.username,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    name: u.username,
                    userAuthId: u.userAuthId,
                    status: u.status,
                    email: u.email,
                    phone: u.phone,
                    image: u.image,
                    title: u.role?.displayName || u.role?.roleName || 'Associate',
                    roleId: u.roleId,
                    referId: u.referId,
                    childs: []
                });
            });

            // Ensure the root user is in the map (even if status/role filters might exclude them normally)
            if (!userMap.has(mainUser.id)) {
                userMap.set(mainUser.id, {
                    id: mainUser.id,
                    username: mainUser.username,
                    firstName: mainUser.firstName,
                    lastName: mainUser.lastName,
                    name: mainUser.username,
                    userAuthId: mainUser.userAuthId,
                    status: mainUser.status,
                    email: mainUser.email,
                    phone: mainUser.phone,
                    image: mainUser.image,
                    title: mainUser.role?.displayName || mainUser.role?.roleName || 'Associate',
                    roleId: mainUser.roleId,
                    referId: mainUser.referId,
                    childs: []
                });
            }

            const treeRoot = userMap.get(mainUser.id);
            const results = [treeRoot];

            // Reconstruct hierarchy in memory
            let totalNodes = 0;
            userMap.forEach(user => {
                totalNodes++;
                if (user.referId && userMap.has(user.referId) && user.id !== mainUser.id) {
                    const parent = userMap.get(user.referId);
                    parent.childs.push(user);
                }
            });

            console.log(`[DEBUG] Tree built successfully. Children of root: ${treeRoot.childs.length}`);

            return reply.send({
                success: true,
                status: 200,
                items: treeRoot,
                totalCount: allUsers.length // or recursively calculate the nodes in the sub-tree
            });

        } catch (error) {
            console.error('[ERROR] /associates-tree:', error);
            return reply.status(500).send({ success: false, message: 'Internal Server Error', error: error.message });
        }
    });

    // ── GET /my-team ──────────────────────────────────────────────────────────
    fastify.get('/my-team', { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const {
                id,
                status = 'VERIFIED',
                page = 1,
                size = 10,
                sortField = 'createdAt',
                sortOrder = 'desc',
                from,
                to,
                search,
            } = request.query;
            const companyId = request.user.companyId;

            console.log(`[DEBUG] /my-team: userType=${request.user.userType}, companyId=${companyId}, queryId=${id}`);

            const roleName = typeof request.user.role === 'string'
                ? request.user.role
                : request.user.role?.roleName;

            const isAdmin =
                request.user.userType?.toLowerCase() === 'admin' ||
                roleName?.toLowerCase() === 'admin';

            let userId = id || request.user.userId;

            // If Admin and no specific ID requested, start from root user
            if (isAdmin && !id) {
                console.log(`[DEBUG] Admin detected in /my-team without ID, searching for root user...`);
                const companyUser = await prisma.user.findFirst({
                    where: { username: 'company', companyId }
                });
                if (companyUser) {
                    userId = companyUser.id;
                    console.log(`[DEBUG] Using root user ID: ${userId}`);
                }
            }

            // Get all subordinates recursively
            const allSubordinateIds = await getAllSubordinateIds(prisma, userId, status, companyId);

            console.log(`[DEBUG] Found ${allSubordinateIds.length} subordinates for user ${userId}`);

            const skip = (parseInt(page) - 1) * parseInt(size);
            const take = parseInt(size);

            const whereClause = {
                id: { in: allSubordinateIds },
                companyId,
            };

            if (status) whereClause.status = status;

            if (from && to && from !== '' && to !== '') {
                whereClause.createdAt = { gte: new Date(from), lte: new Date(to) };
            } else if (from && from !== '') {
                whereClause.createdAt = { gte: new Date(from) };
            } else if (to && to !== '') {
                whereClause.createdAt = { lte: new Date(to) };
            }

            if (search) {
                whereClause.OR = [
                    { username: { contains: search, mode: 'insensitive' } },
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search } },
                ];
            }

            const [teamMembers, total] = await Promise.all([
                prisma.user.findMany({
                    where: whereClause,
                    include: {
                        role: true,
                        company: { select: { company: true } },
                    },
                    orderBy: { [sortField]: sortOrder.toLowerCase() },
                    skip,
                    take,
                }),
                prisma.user.count({ where: whereClause }),
            ]);

            return reply.send({
                success: true,
                status: 200,
                items: teamMembers,
                total,
                pageNumber: page,
                pageLimit: size,
            });
        } catch (error) {
            console.error('[ERROR] /my-team:', error);
            return reply.status(500).send({ success: false, message: 'Internal Server Error', error: error.message });
        }
    });
}
