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
                roleName?.toLowerCase().includes('admin') ||
                roleNo <= 4;

            // 1. Fetch data from all hierarchy levels
            const [clientAdmin, admins, allUsers, allTelecallers] = await Promise.all([
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
                }),
                prisma.telecaller.findMany({
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

            // 3. Determine targetId
            let targetId = id || request.user.userId || companyRoot?.id;

            // 4. Build a unified map for all entities
            const getName = (u) => (`${u.firstName || ''} ${u.lastName || ''}`).trim() || u.username || 'User';

            const mapUser = (u, source) => {
                if (!u) return null;
                return {
                    id: u.id,
                    username: u.username,
                    firstName: u.firstName,
                    lastName: u.lastName,
                    name: getName(u),
                    status: u.status || 'VERIFIED',
                    email: u.email,
                    phone: u.phone,
                    image: u.image,
                    title: u.role?.displayName || u.role?.roleName || source,
                    roleName: u.role?.roleName,
                    roleId: u.roleId,
                    referId: u.referId || (u.id !== companyRoot?.id ? companyRoot?.id : null),
                    childs: []
                };
            };

            // Fetch Target User
            let targetUser = await prisma.user.findUnique({ where: { id: targetId }, include: { role: true } });
            if (!targetUser) targetUser = await prisma.admin.findUnique({ where: { id: targetId }, include: { role: true } });
            if (!targetUser) targetUser = await prisma.clientAdmin.findUnique({ where: { id: targetId } });

            if (!targetUser) {
                return reply.send({ success: true, items: null, totalCount: 0 });
            }

            const mappedTarget = mapUser(targetUser, 'Associate');
            
            // 5. Fetch Parent (If Target is not Company Root)
            let parentNode = null;
            if (targetUser.referId || (targetId !== companyRoot?.id && companyRoot)) {
                const parentId = targetUser.referId || companyRoot.id;
                let parent = await prisma.admin.findUnique({ where: { id: parentId }, include: { role: true } });
                if (!parent) parent = await prisma.clientAdmin.findUnique({ where: { id: parentId } });
                if (!parent) parent = await prisma.user.findUnique({ where: { id: parentId }, include: { role: true } });
                
                if (parent) {
                    parentNode = mapUser(parent, 'Admin');
                }
            }

            // 6. Fetch Immediate Children (Users, Telecallers, Admins)
            const [users, telecallers, adminsList] = await Promise.all([
                prisma.user.findMany({ where: { referId: targetId }, include: { role: true } }),
                prisma.telecaller.findMany({ where: { referId: targetId }, include: { role: true } }),
                // Admins don't have referId, so we only show them under the Company Root
                targetId === companyRoot?.id 
                    ? prisma.admin.findMany({ where: { companyId: request.user.companyId }, include: { role: true } })
                    : Promise.resolve([])
            ]);

            const mappedChildren = [
                ...users.map(u => mapUser(u, 'Associate')),
                ...telecallers.map(u => mapUser(u, 'Telecaller')),
                ...adminsList.map(u => mapUser(u, 'Admin'))
            ];

            // 7. Assemble the 3-Tier Tree
            mappedTarget.childs = mappedChildren;

            // SPECIAL LOGIC: For Marketing Admin, show people with 'Company' role below them
            const roleNameLower = targetUser.role?.roleName?.toLowerCase() || '';
            const titleLower = mappedTarget.title?.toLowerCase() || '';
            
            // Be more inclusive: check title and roleName for 'marketing' OR 'admin'
            const isMarketingAdmin = titleLower.includes('marketing') || 
                                    roleNameLower.includes('marketing') ||
                                    titleLower.includes('admin') ||
                                    roleNameLower.includes('admin');
            
            if (isMarketingAdmin && targetId !== companyRoot?.id) {
                // 1. Find the 'Company' role(s)
                const companyRoles = await prisma.role.findMany({
                    where: { 
                        roleName: { equals: 'company', mode: 'insensitive' } 
                    }
                });
                const companyRoleIds = companyRoles.map(r => r.id);

                if (companyRoleIds.length > 0) {
                    // 2. Fetch all users with this role
                    const companyUsers = await prisma.user.findMany({
                        where: { 
                            roleId: { in: companyRoleIds },
                            companyId: request.user.companyId
                        },
                        include: { role: true }
                    });

                    // 3. For each company user, fetch their reports (Associates)
                    const companyUserIds = companyUsers.map(u => u.id);
                    const associates = await prisma.user.findMany({
                        where: { 
                            referId: { in: companyUserIds },
                            companyId: request.user.companyId
                        },
                        include: { role: true }
                    });

                    // 4. Add company users AND their associates to children
                    companyUsers.forEach(u => {
                        const child = mapUser(u, 'Company');
                        if (child.id !== mappedTarget.id && !mappedTarget.childs.find(c => c.id === child.id)) {
                            mappedTarget.childs.push(child);
                        }
                    });

                    associates.forEach(u => {
                        const child = mapUser(u, 'Associate');
                        if (child.id !== mappedTarget.id && !mappedTarget.childs.find(c => c.id === child.id)) {
                            mappedTarget.childs.push(child);
                        }
                    });
                }
            }

            let finalTree = mappedTarget;
            if (parentNode) {
                parentNode.childs = [mappedTarget];
                finalTree = parentNode;
            }

            console.log(`[DEBUG] Focused Tree built for: ${mappedTarget.name}`);

            return reply.send({
                success: true,
                status: 200,
                items: finalTree,
                totalCount: 1 + (parentNode ? 1 : 0) + mappedChildren.length
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
