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

            // Helper to find main user across user and admin tables
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

                return null;
            };

            const isAdmin = request.user.role?.roleName?.toUpperCase() === 'ADMIN' || request.user.role_name?.toUpperCase() === 'ADMIN';

            if (isAdmin) {
                let associateId = id ? id : request.user.userId;

                // 1. Fetch the root node (Admin or User)
                const mainUserNode = await findMainUser(associateId);
                if (mainUserNode) {
                    // Fix Naming: If it's the logged-in Admin and name is 'admin', try to use a better name
                    const rawAdmin = await fastify.prisma.admin.findUnique({ where: { id: associateId } });
                    if (rawAdmin) {
                        const fullName = `${rawAdmin.firstName || ''} ${rawAdmin.lastName || ''}`.trim();
                        if (fullName) mainUserNode.name = fullName;
                    }
                    root.push(mainUserNode);
                }

                // 2. Fetch all users in company
                const allUsersInCompany = await fastify.prisma.user.findMany({
                    where: { companyId, status: status || 'VERIFIED' },
                    include: { role: true }
                });

                // 3. Build Node Map and child relationship
                const nodesMap = { [associateId]: root[0] };
                const userNodes = allUsersInCompany.map(formatUserNode);
                userNodes.forEach(node => {
                    if (node.id !== associateId) nodesMap[node.id] = node;
                });

                // 4. Attach children
                for (const node of userNodes) {
                    if (node.id === associateId) continue;

                    // If parent is the current root (Admin), attach directly
                    // Or if parent is another user in our map, attach to them
                    const parentId = node.refer_id;
                    if (parentId === associateId) {
                        if (root[0]) root[0].childs.push(node);
                    } else if (parentId && nodesMap[parentId]) {
                        nodesMap[parentId].childs.push(node);
                    } else {
                        // ORPHAN/ROOT USER: Attach to Admin if we are at the top-level Admin view
                        if (!id && root[0]) {
                            root[0].childs.push(node);
                        }
                    }
                }
            } else {
                let defaultId = request.user.userId; // user id inside token
                let associateId = id ? id : defaultId;

                const mainUserNode = await findMainUser(associateId);

                if (mainUserNode) {
                    root.push(mainUserNode);
                }

                // Get flat users
                const flatUsers = await fastify.prisma.user.findMany({
                    where: { status: status || 'VERIFIED' },
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
                return nodes
                    .map((node) => {
                        if (node.childs && node.childs.length > 0) {
                            node.childs = sortTreeByRole(node.childs);
                        }
                        return node;
                    })
                    .sort((a, b) => {
                        const roleA = roleMap.get(a.role)?.roleNo || 0;
                        const roleB = roleMap.get(b.role)?.roleNo || 0;
                        return roleA - roleB;
                    });
            };
            root = sortTreeByRole(root);

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
                return nodes.reduce(
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
