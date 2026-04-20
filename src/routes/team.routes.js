import authMiddleware from '../middlewares/auth.middleware.js';
import { getAllSubordinateIds } from '../utils/hierarchy.js';


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
            const roleNo = request.user.roleNo ?? 999;
            const userType = request.user.userType?.toLowerCase();

            const isPowerRole =
                userType === 'clientadmin' ||
                roleName?.toLowerCase() === 'admin' ||
                roleNo <= 4;

            // 1. Fetch data from all hierarchy levels
            const [clientAdmin, admins, allUsers] = await Promise.all([
                // Use findFirst because companyId might not be the PK
                prisma.clientAdmin.findFirst({ where: { companyId } }),
                prisma.admin.findMany({ where: { companyId }, include: { role: true } }),
                prisma.user.findMany({
                    where: {
                        companyId,
                        ...(status ? { status } : {}),
                        ...(roleId ? { roleId } : {})
                    },
                    include: { role: true }
                })
            ]);

            // 2. Identify the "True Root" (Company Admin)
            let companyRoot = null;
            
            // Priority 1: ClientAdmin table
            if (clientAdmin) {
                companyRoot = {
                    id: clientAdmin.id,
                    username: clientAdmin.username,
                    firstName: clientAdmin.firstName,
                    lastName: clientAdmin.lastName,
                    image: clientAdmin.image,
                    email: clientAdmin.email,
                    phone: clientAdmin.phone,
                    title: 'Company Admin',
                    sourceTable: 'ClientAdmin'
                };
            }
            
            // Priority 2: User with role COMPANY_ADMIN
            if (!companyRoot) {
                const caUser = allUsers.find(u => 
                    u.role?.roleName?.toUpperCase() === 'COMPANY_ADMIN' || 
                    u.role?.roleNo === 1 || 
                    u.username?.toLowerCase() === 'company'
                );
                if (caUser) {
                    companyRoot = {
                        id: caUser.id,
                        username: caUser.username,
                        firstName: caUser.firstName,
                        lastName: caUser.lastName,
                        image: caUser.image,
                        email: caUser.email,
                        phone: caUser.phone,
                        title: caUser.role?.displayName || caUser.role?.roleName || 'Company Admin',
                        sourceTable: 'User'
                    };
                }
            }

            // 3. Determine startId
            let startId = id;
            if (!startId) {
                // If the user hasn't selected a node, start from the Company Root (if we are a power role)
                // or the user's manager context.
                startId = companyRoot?.id || request.user.userId;
            }

            // 4. Build a unified map for all entities
            const userMap = new Map();
            const getName = (u) => u.username || (`${u.firstName || ''} ${u.lastName || ''}`).trim() || 'User';

            // Add the identified Company Root (if they aren't already in another list)
            if (companyRoot) {
                userMap.set(companyRoot.id, {
                    ...companyRoot,
                    name: getName(companyRoot),
                    userAuthId: companyRoot.id?.substring(0, 8),
                    childs: []
                });
            }

            // Add Admins (SECOND LAYER)
            admins.forEach(u => {
                userMap.set(u.id, {
                    id: u.id,
                    username: u.username,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    name: getName(u),
                    userAuthId: u.id?.substring(0, 8),
                    status: 'VERIFIED',
                    email: u.email,
                    phone: u.phone,
                    image: u.image,
                    title: u.role?.displayName || u.role?.roleName || 'Admin',
                    roleId: u.roleId,
                    referId: companyRoot?.id || null, // Admins report to the Company Root
                    childs: []
                });
            });

            // Add Users (LAYER 3+)
            allUsers.forEach(u => {
                userMap.set(u.id, {
                    id: u.id,
                    username: u.username,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    name: getName(u),
                    userAuthId: u.userAuthId || u.id?.substring(0, 8),
                    status: u.status,
                    email: u.email,
                    phone: u.phone,
                    image: u.image,
                    title: u.role?.displayName || u.role?.roleName || 'Associate',
                    roleId: u.roleId,
                    referId: u.referId, // Links to a User OR an Admin
                    childs: []
                });
            });

            // Ensure requested node exists
            if (!userMap.has(startId)) {
               // Fallback load for specific IDs
               let extra = await prisma.user.findUnique({ where: { id: startId }, include: { role: true } });
               if (!extra) extra = await prisma.admin.findUnique({ where: { id: startId }, include: { role: true } });
               if (extra) {
                   userMap.set(extra.id, {
                       id: extra.id,
                       username: extra.username,
                       firstName: extra.firstName,
                       lastName: extra.lastName,
                       name: getName(extra),
                       userAuthId: extra.userAuthId || extra.id?.substring(0, 8),
                       status: extra.status || 'VERIFIED',
                       email: extra.email,
                       phone: extra.phone,
                       image: extra.image,
                       title: extra.role?.displayName || extra.role?.roleName || 'Associate',
                       roleId: extra.roleId,
                       referId: extra.referId || (extra.companyId === companyRoot?.companyId ? companyRoot?.id : null),
                       childs: []
                   });
               }
            }

            if (!userMap.has(startId)) {
                return reply.send({ success: true, items: [], totalCount: 0 });
            }

            const treeRoot = userMap.get(startId);

            // 5. Build Hierarchy
            userMap.forEach(user => {
                if (user.referId && userMap.has(user.referId) && user.id !== startId) {
                    const parent = userMap.get(user.referId);
                    parent.childs.push(user);
                }
            });

            console.log(`[DEBUG] Tree Finalized. Root: ${treeRoot.name}, Hierarchy Level: ${companyRoot ? 'Full Company' : 'Partial'}`);

            return reply.send({
                success: true,
                status: 200,
                items: treeRoot,
                totalCount: userMap.size
            });

        } catch (error) {
            console.error('[ERROR] /associates-tree:', error);
            return reply.status(500).send({ success: false, message: 'Internal Server Error', error: error.message, items: [] });
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
            const skip = (Number(page) - 1) * Number(size);
            const take = Number(size);
            const companyId = request.user.companyId;

            console.log(`[DEBUG] /my-team: userType=${request.user.userType}, companyId=${companyId}, queryId=${id}`);

            const roleName = typeof request.user.role === 'string'
                ? request.user.role
                : request.user.role?.roleName;
            const roleNo = request.user.roleNo ?? 999;
            const userType = request.user.userType?.toLowerCase();

            const isPowerRole =
                userType === 'clientadmin' ||
                roleName?.toLowerCase() === 'admin' ||
                roleNo <= 4;

            let userId = id || request.user.userId;
            let whereClause = { companyId };

            if (isPowerRole && !id) {
                console.log(`[DEBUG] Power Role detected in /my-team without ID, showing all company users...`);
                // No additional filtering needed, whereClause already has companyId
            } else {
                // Get all subordinates recursively starting from userId
                const allSubordinateIds = await getAllSubordinateIds(prisma, userId, companyId, status);
                console.log(`[DEBUG] Found ${allSubordinateIds.length} subordinates for user ${userId}`);
                whereClause.id = { in: allSubordinateIds };
            }

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
