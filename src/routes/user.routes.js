import authMiddleware from "../middlewares/auth.middleware.js";

export default async function userRoutes(fastify) {
    fastify.addHook("preHandler", authMiddleware);

    // Get simple list of user names and IDs for the company
    fastify.get("/names", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const users = await fastify.prisma.user.findMany({
                where: { companyId },
                select: {
                    id: true,
                    username: true,
                    firstName: true,
                    lastName: true
                },
                orderBy: { username: 'asc' }
            });

            // Format to match expected frontend structure if necessary
            const formattedUsers = users.map(u => ({
                id: u.id,
                username: u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown'
            }));

            return reply.send({
                success: true,
                data: {
                    items: formattedUsers
                }
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get potential parents (Admins + Users) for hierarchy selection
    fastify.get("/potential-parents", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const [users, admins] = await Promise.all([
                fastify.prisma.user.findMany({
                    where: { companyId, status: 'VERIFIED' },
                    select: { id: true, username: true, firstName: true, lastName: true },
                    orderBy: { username: 'asc' }
                }),
                fastify.prisma.admin.findMany({
                    where: { companyId, status: 'VERIFIED' },
                    select: { id: true, username: true, firstName: true, lastName: true },
                    orderBy: { username: 'asc' }
                })
            ]);

            const combined = [
                ...admins.map(a => ({ 
                    id: a.id, 
                    username: a.username || `${a.firstName || ''} ${a.lastName || ''}`.trim() || 'Unknown Admin',
                    label: `(Admin) ${a.username || a.firstName || 'Admin'}`
                })),
                ...users.map(u => ({ 
                    id: u.id, 
                    username: u.username || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Unknown User',
                    label: u.username || u.firstName || 'User'
                }))
            ];

            return reply.send({ success: true, data: { items: combined } });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // ==========================================
    // ASSOCIATES CRUD ENDPOINTS (For Admin/Pro)
    // ==========================================

    // GET /associates - Fetch paginated list of associates/users
    fastify.get("/associates", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { page = 1, size = 10, name, status, role, username, phone, id, userAuthId, sortField = 'createdAt', sortOrder = 'desc' } = req.query;

            const skip = (Number(page) - 1) * Number(size);
            const take = Number(size);

            const where = { companyId: companyId };

            if (id) where.id = id;
            if (userAuthId) where.userAuthId = { contains: userAuthId, mode: 'insensitive' };
            if (status) where.status = status;
            if (role) {
                if (role.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
                    where.roleId = role;
                } else {
                    where.role = { roleName: { equals: role, mode: 'insensitive' } };
                }
            }
            if (phone) where.phone = { contains: phone };
            if (username) where.username = { contains: username, mode: 'insensitive' };
            if (name) {
                where.OR = [
                    { username: { contains: name, mode: 'insensitive' } },
                    { firstName: { contains: name, mode: 'insensitive' } },
                    { lastName: { contains: name, mode: 'insensitive' } },
                ];
            }

            const [items, total] = await Promise.all([
                fastify.prisma.user.findMany({
                    where,
                    skip,
                    take,
                    include: { role: true },
                    orderBy: { [sortField]: sortOrder }
                }),
                fastify.prisma.user.count({ where })
            ]);

            // Enrich with upliner usernames if referId exists
            const referIds = [...new Set(items.map(u => u.referId).filter(Boolean))];
            let referMap = {};
            if (referIds.length > 0) {
                const referUsers = await fastify.prisma.user.findMany({
                    where: { id: { in: referIds } },
                    select: { id: true, username: true }
                });
                referMap = Object.fromEntries(referUsers.map(u => [u.id, u.username]));
            }

            const enrichedItems = items.map(u => ({
                ...u,
                referUser: u.referId ? { username: referMap[u.referId] || null } : null
            }));

            return reply.send({
                success: true,
                total,
                items: enrichedItems,
                pageNumber: Number(page),
                pageLimit: Number(size),
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // GET /associate/:id - Fetch single associate details
    fastify.get("/associate/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;

            const user = await fastify.prisma.user.findFirst({
                where: { id, companyId },
                include: { role: true }
            });

            if (!user) {
                return reply.code(404).send({ success: false, message: "Associate not found" });
            }

            return reply.send({ success: true, user });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // POST /add-associate - Create or update an associate
    fastify.post("/add-associate", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;
            // The frontend sometimes sends id as recordId when updating
            const targetId = body.id || body.recordId;

            const bcrypt = await import("bcrypt");
            const saltRounds = 10;

            const data = {
                firstName: body.firstName,
                lastName: body.lastName,
                username: body.username,
                email: body.email,
                phone: body.phone,
                alternativePhone: body.alternativePhone,
                address: body.address,
                city: body.city,
                state: body.state,
                country: body.country,
                zipCode: body.zipCode,
                status: body.status || "PENDING",
                roleId: body.roleId || body.role,
                image: body.image || body.img,
                referId: body.referId || body.refer_id || body.teamHeadId || body.team_head_id || null,
                teamHeadId: body.referId || body.refer_id || body.teamHeadId || body.team_head_id || null,
                companyId: companyId,
                createdById: req.user.userId,
                dob: body.dob ? new Date(body.dob) : null,
                gender: body.gender,
                bloodGroup: body.bloodGroup,
                designation: body.designation,
            };


            if (body.password) {
                data.password = await bcrypt.hash(body.password, saltRounds);
                data.passwordChanged = true;
            }

            let user;
            if (targetId) {
                // Update
                user = await fastify.prisma.user.update({
                    where: { id: targetId },
                    data
                });
            } else {
                // Create
                const { v4: uuid } = await import("uuid");
                data.id = uuid();

                // If password not given, give default
                if (!data.password) {
                    data.password = await bcrypt.hash("Realgo@123", saltRounds);
                    data.passwordChanged = false;
                }

                // Temporary generation of userAuthId (mock format)
                data.userAuthId = `G-${Date.now().toString().slice(-6)}`;

                // Check phone uniqueness
                const exists = await fastify.prisma.user.findFirst({ where: { phone: data.phone, companyId } });
                if (exists) {
                    return reply.code(409).send({ success: false, message: "User Auth ID or Phone already exists" });
                }

                user = await fastify.prisma.user.create({ data });
            }

            return reply.send({ success: true, message: "User saved successfully", data: user });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // DELETE /associate-delete/:id - Delete an associate
    fastify.delete("/associate-delete/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;

            const existing = await fastify.prisma.user.findFirst({ where: { id, companyId } });
            if (!existing) {
                return reply.code(404).send({ success: false, message: "Associate not found" });
            }

            // Move the subordinates up
            await fastify.prisma.user.updateMany({
                where: { referId: id },
                data: { referId: existing.referId }
            });

            await fastify.prisma.user.delete({ where: { id } });

            return reply.send({ success: true, message: "User deleted" });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // PUT /associate-status - Change Associate status
    fastify.put("/associate-status", async (req, reply) => {
        try {
            const { id, status } = req.body;
            const { companyId } = req.user;

            const user = await fastify.prisma.user.update({
                where: { id },
                data: { status }
            });

            return reply.send({ success: true, message: "Status updated successfully", user });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // PUT /associate-promote - Promote Associate
    fastify.put("/associate-promote", async (req, reply) => {
        try {
            const { id, referId, roleId } = req.body;

            const dataToUpdate = {};
            if (referId !== undefined) dataToUpdate.referId = referId;
            if (roleId !== undefined) dataToUpdate.roleId = roleId;

            const user = await fastify.prisma.user.update({
                where: { id },
                data: dataToUpdate
            });

            return reply.send({ success: true, message: "Associate promoted", user });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // POST /reset-password - Reset Associate password
    fastify.post("/reset-password", async (req, reply) => {
        try {
            const { id, password } = req.body;
            const bcrypt = await import("bcrypt");

            const hashedPassword = await bcrypt.hash(password, 10);
            await fastify.prisma.user.update({
                where: { id },
                data: { password: hashedPassword, passwordChanged: true }
            });

            return reply.send({ success: true, message: "Password reset successful" });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });
}

