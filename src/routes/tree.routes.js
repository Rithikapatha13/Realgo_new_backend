import authMiddleware from "../middlewares/auth.middleware.js";

// Recursively collects all descendant user IDs starting from rootId
function collectDescendants(rootId, childrenMap) {
    const result = [];
    const queue = [rootId];
    while (queue.length > 0) {
        const current = queue.shift();
        const children = childrenMap[current] || [];
        for (const child of children) {
            result.push(child);
            queue.push(child);
        }
    }
    return result;
}

export async function teamTreeRoutes(fastify) {
    // =====================================================
    // GET MY TEAM (LIST) — same company + subordinates only
    // =====================================================
    fastify.get("/my-team", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { userId, companyId } = req.user;

            // Fetch all users in the same company
            const allUsers = await fastify.prisma.user.findMany({
                where: { companyId },
                include: {
                    role: true,
                    company: { select: { company: true } },
                },
                orderBy: { firstName: "asc" },
            });

            // Build a map: parentId -> [childIds]
            const childrenMap = {};
            for (const u of allUsers) {
                if (u.teamHeadId) {
                    if (!childrenMap[u.teamHeadId]) childrenMap[u.teamHeadId] = [];
                    childrenMap[u.teamHeadId].push(u.id);
                }
            }

            // Get all descendant IDs of the logged-in user
            const descendantIds = new Set(collectDescendants(userId, childrenMap));

            // Filter to only subordinates
            const teamMembers = allUsers.filter((u) => descendantIds.has(u.id));

            return teamMembers;
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ message: "Error fetching team" });
        }
    });

    // =====================================================
    // GET TEAM TREE (HIERARCHY) — same company, rooted at logged-in user
    // =====================================================
    fastify.get("/team-tree", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { userId, companyId } = req.user;

            // Fetch all users in the same company
            const allUsers = await fastify.prisma.user.findMany({
                where: { companyId },
                include: { role: true },
                orderBy: { createdAt: "asc" },
            });

            // Build node map
            const map = {};
            for (const u of allUsers) {
                map[u.id] = {
                    id: u.id,
                    name: `${u.firstName} ${u.lastName || ""}`.trim(),
                    role: u.role?.roleName || "No Role",
                    code: u.userAuthId || u.id.substring(0, 5),
                    image: u.image || null,
                    children: [],
                };
            }

            // Wire up parent-child relationships (only within same company)
            for (const u of allUsers) {
                if (u.teamHeadId && map[u.teamHeadId]) {
                    map[u.teamHeadId].children.push(map[u.id]);
                }
            }

            // Return the tree rooted at the logged-in user
            // If they aren't in the map (e.g. admin), return their direct reports
            const rootNode = map[userId] || null;
            return rootNode || {};
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ message: "Error building tree" });
        }
    });

    // =====================================================
    // GET ASSOCIATES TREE (Provided Logic via Step 4)
    // =====================================================
    fastify.get("/associates-tree", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const companyId = request.user.companyId;
            const { name, id, status, role } = request.query;
            let root = [];

            // Get Roles for sorting
            const rolesData = await fastify.prisma.role.findMany({
                where: { companyId },
                orderBy: { roleNo: 'asc' }
            });
            const roleMap = new Map();
            rolesData.forEach((r) => {
                roleMap.set(r.id, r);
            });

            const formatUserNode = (u) => ({
                id: u.id,
                name: u.username || `${u.firstName || ''} ${u.lastName || ""}`.trim() || 'Unknown',
                user_auth_id: u.userAuthId || u.id.substring(0, 5),
                status: u.status,
                email: u.email,
                phone: u.phone,
                image: u.image ? (u.image.startsWith('http') ? u.image : `https://garuda-assets-bucket.s3.amazonaws.com/${u.image}`) : null,
                role: u.roleId,
                title: u.role?.roleName || 'No Role',
                refer_id: u.teamHeadId || u.referId || null,
                childs: []
            });

            // Helper to find main user across user, admin, and clientAdmin tables
            const findMainUser = async (uId) => {
                let u = await fastify.prisma.user.findUnique({
                    where: { id: uId },
                    include: { role: true }
                });
                if (u) return formatUserNode(u);

                u = await fastify.prisma.admin.findUnique({
                    where: { id: uId },
                    include: { role: true }
                });
                if (u) return formatUserNode(u);

                u = await fastify.prisma.clientAdmin.findUnique({
                    where: { id: uId },
                    include: { company: true }
                });
                if (u) {
                    const node = formatUserNode(u);
                    node.title = "Company Admin";
                    return node;
                }

                return null;
            };

            const roleName = (request.user.role?.roleName || request.user.role_name || "").toUpperCase();
            const roleNo = request.user.roleNo ?? 999;
            const isAdmin = roleName === 'ADMIN' || roleName === 'COMPANY_ADMIN' || roleName === 'SUPERADMIN' || roleNo <= 4;

            if (isAdmin) {
                let associateId = id ? id : request.user.userId;

                // 1. Fetch the root node
                const mainUserNode = await findMainUser(associateId);
                if (mainUserNode) {
                    root.push(mainUserNode);
                } else {
                    // Fallback to minimal root if not found
                    root.push({ id: associateId, name: "Company Root", childs: [] });
                }

                // 2. Fetch all users AND admins in company
                const [allUsersInCompany, allAdminsInCompany] = await Promise.all([
                    fastify.prisma.user.findMany({
                        where: { companyId, status: status || 'VERIFIED' },
                        include: { role: true }
                    }),
                    fastify.prisma.admin.findMany({
                        where: { companyId, status: status || 'VERIFIED' },
                        include: { role: true }
                    })
                ]);

                // 3. Build Node Map
                const nodesMap = { [associateId]: root[0] };
                
                const adminNodes = allAdminsInCompany.map(formatUserNode);
                const userNodes = allUsersInCompany.map(formatUserNode);

                adminNodes.forEach(node => { if (node.id !== associateId) nodesMap[node.id] = node; });
                userNodes.forEach(node => { if (node.id !== associateId) nodesMap[node.id] = node; });

                // 4. Attach admins to root (Admins/Leaders are usually direct reports to Company Admin)
                for (const node of adminNodes) {
                    if (node.id === associateId) continue;
                    if (root[0]) root[0].childs.push(node);
                }

                // 5. Attach users to their parents (could be another user or an admin)
                for (const node of userNodes) {
                    if (node.id === associateId) continue;

                    const parentId = node.refer_id;
                    if (parentId === associateId) {
                        if (root[0]) root[0].childs.push(node);
                    } else if (parentId && nodesMap[parentId]) {
                        nodesMap[parentId].childs.push(node);
                    } else if (!id && root[0]) {
                        // Orphan users at top level
                        root[0].childs.push(node);
                    }
                }
            } else {
                // For non-admins (e.g. associates with roleNo > 0)
                // We want the tree to start from their LEADER (teamHeadId)
                // so they can see themselves AND their peers on the same row.
                
                const loggedInUserRecord = await fastify.prisma.user.findUnique({
                    where: { id: request.user.userId },
                    select: { teamHeadId: true, referId: true }
                });

                const leaderId = loggedInUserRecord?.teamHeadId || loggedInUserRecord?.referId;
                let associateId = id ? id : (leaderId || request.user.userId);

                const mainUserNode = await findMainUser(associateId);
                if (mainUserNode) {
                    root.push(mainUserNode);
                }

                // Get flat users in the same company
                const flatUsers = await fastify.prisma.user.findMany({
                    where: { companyId, status: status || 'VERIFIED' },
                    include: { role: true }
                });

                const nodesMap = { [associateId]: root[0] };
                const flat = flatUsers.map(formatUserNode);

                for (const node of flat) {
                    if (node.id !== associateId) {
                        nodesMap[node.id] = node;
                    }
                }

                for (const node of flat) {
                    if (node.id === associateId) continue;

                    if (node.refer_id === associateId) {
                        if (root.length > 0) root[0].childs.push(nodesMap[node.id]);
                    } else if (node.refer_id) {
                        const parent = nodesMap[node.refer_id];
                        if (parent) {
                            if (!parent.childs) parent.childs = [];
                            parent.childs.push(nodesMap[node.id]);
                        }
                    }
                }
            }

            const sortTreeByRole = (nodes) => {
                if (!nodes) return [];
                const nodeList = Array.isArray(nodes) ? nodes : [nodes];
                return nodeList
                    .map((node) => {
                        if (node.childs && node.childs.length > 0) {
                            node.childs = sortTreeByRole(node.childs);
                        }
                        return node;
                    })
                    .sort((a, b) => {
                        const roleA = roleMap.get(a.role)?.roleNo || 999;
                        const roleB = roleMap.get(b.role)?.roleNo || 999;
                        return roleA - roleB;
                    });
            };
            
            if (root.length > 0) {
                root = sortTreeByRole(root);
            }

            if (role) {
                const filterTreeByRole = (nodes) => {
                    if (!nodes) return [];
                    return nodes
                        .map((node) => {
                            if (node.childs && node.childs.length > 0) {
                                node.childs = filterTreeByRole(node.childs);
                            }
                            return node.role === role || (node.childs && node.childs.length > 0) ? node : null;
                        })
                        .filter(Boolean);
                };
                root = filterTreeByRole(root);
            }

            const countNodeAndDescendants = (nodes) => {
                if (!nodes) return 0;
                const nodeList = Array.isArray(nodes) ? nodes : [nodes];
                return nodeList.reduce(
                    (count, node) => count + 1 + (node.childs ? countNodeAndDescendants(node.childs) : 0),
                    0
                );
            };
            const totalCount = countNodeAndDescendants(root);

            return reply.send({ success: true, status: 200, items: root[0] || {}, totalCount });
        } catch (e) {
            console.error("ASSOCIATES-TREE ERROR: ", e);
            fastify.log.error(e);
            return reply.code(500).send({ message: 'Server error', error: e.message, stack: e.stack });
        }
    });
}
