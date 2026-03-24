import authMiddleware from "../middlewares/auth.middleware.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";

const saltRounds = 10;

export default async function adminRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // GET /api/admins
    fastify.get("/admins", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const { page = 0, size = 10, name } = req.query;
            const skip = Number(page) * Number(size);
            const take = Number(size);

            const where = { companyId };
            if (name) {
                where.OR = [
                    { username: { contains: name, mode: 'insensitive' } },
                    { firstName: { contains: name, mode: 'insensitive' } },
                    { lastName: { contains: name, mode: 'insensitive' } }
                ];
            }

            const [items, total] = await Promise.all([
                prisma.admin.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                    include: { role: true }
                }),
                prisma.admin.count({ where }),
            ]);

            return reply.send({
                success: true,
                total,
                items,
                pageNumber: Number(page),
                pageLimit: Number(size),
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // POST /api/add-admin
    fastify.post("/add-admin", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const body = req.body;

            const existingAdmin = await prisma.admin.findFirst({
                where: { phone: body.phone, companyId }
            });

            if (existingAdmin) {
                return reply.code(400).send({ success: false, message: "Admin with this phone already exists in this company" });
            }

            const hashedPassword = await bcrypt.hash(body.password || "Realgo@123", saltRounds);

            const admin = await prisma.admin.create({
                data: {
                    id: uuid(),
                    username: body.username,
                    firstName: body.firstName,
                    lastName: body.lastName,
                    phone: body.phone,
                    email: body.email,
                    password: hashedPassword,
                    address: body.address,
                    image: body.img || body.image,
                    alternativePhone: body.alternativePhone,
                    status: body.status || "PENDING",
                    companyId: companyId,
                    roleId: body.roleId,
                    passwordChanged: false
                }
            });

            return reply.send({ success: true, message: "Admin created successfully", data: admin });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // GET /api/admin/:id
    fastify.get("/admin/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const admin = await prisma.admin.findUnique({
                where: { id },
                include: { role: true }
            });

            if (!admin) {
                return reply.code(404).send({ success: false, message: "Admin not found" });
            }

            return reply.send({ success: true, admin });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // PUT /api/admin
    fastify.put("/admin", async (req, reply) => {
        try {
            const { id, ...data } = req.body;

            const updateData = {
                username: data.username,
                firstName: data.firstName,
                lastName: data.lastName,
                phone: data.phone,
                email: data.email,
                address: data.address,
                image: data.img || data.image,
                alternativePhone: data.alternativePhone,
                roleId: data.roleId,
            };

            if (data.password) {
                updateData.password = await bcrypt.hash(data.password, saltRounds);
                updateData.passwordChanged = true;
            }

            const admin = await prisma.admin.update({
                where: { id },
                data: updateData
            });

            return reply.send({ success: true, message: "Admin updated successfully", admin });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // PUT /api/admin-status
    fastify.put("/admin-status", async (req, reply) => {
        try {
            const { id, status } = req.body;
            const admin = await prisma.admin.update({
                where: { id },
                data: { status }
            });
            return reply.send({ success: true, message: "Admin status updated", admin });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // DELETE /api/admin/:id
    fastify.delete("/admin/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            await prisma.admin.delete({ where: { id } });
            return reply.send({ success: true, message: "Admin deleted successfully" });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });
}
