import { v4 as uuid } from "uuid";
import authMiddleware from "../middlewares/auth.middleware.js";

export default async function greetingsRoutes(fastify) {
    const { prisma } = fastify;

    // ===============================
    // GET ACTIVE GREETINGS (PAGINATED)
    // ===============================
    fastify.get("/greetings", { preHandler: authMiddleware }, async (req, reply) => {
        if (!req.user?.userId) {
            return reply.code(401).send({ success: false });
        }

        const { page = 0, size = 10, file_category } = req.query;
        const skip = Number(page) * Number(size);
        const take = Number(size);

        const [items, total] = await Promise.all([
            prisma.gallery.findMany({
                where: {
                    companyId: req.user.companyId,
                    fileCategory: file_category,
                    status: "ACTIVE",
                },
                orderBy: { createdAt: "desc" },
                skip,
                take,
            }),
            prisma.gallery.count({
                where: {
                    companyId: req.user.companyId,
                    fileCategory: file_category,
                    status: "ACTIVE",
                },
            }),
        ]);

        return {
            success: true,
            status: 200,
            total,
            items,
            pageNumber: Number(page),
            pageLimit: Number(size),
        };
    });

    // ==================================
    // GET INACTIVE / SCHEDULED GREETINGS
    // ==================================
    fastify.get("/inactive-greetings", { preHandler: authMiddleware }, async (req, reply) => {
        if (!req.user?.userId) {
            return reply.code(401).send({ success: false });
        }

        const { year, month } = req.query;

        let where = {
            companyId: req.user.companyId,
            status: "INACTIVE",
        };

        if (year && month) {
            where.scheduledAt = {
                gte: new Date(year, month - 1, 1),
                lt: new Date(year, month, 1),
            };
        }

        const items = await prisma.gallery.findMany({
            where,
            orderBy: { scheduledAt: "asc" },
        });

        return {
            success: true,
            status: 200,
            total: items.length,
            items,
        };
    });

    // ===============================
    // CREATE GREETING
    // ===============================
    fastify.post("/upload-greetings", { preHandler: authMiddleware }, async (req, reply) => {
        if (!req.user?.userId) {
            return reply.code(401).send({ success: false });
        }

        const {
            file_name,
            file_category,
            schedule_later,
            scheduled_at,
        } = req.body;

        const data = await prisma.gallery.create({
            data: {
                id: uuid(),
                fileName: file_name,
                fileCategory: file_category,
                companyId: req.user.companyId,
                status: schedule_later ? "INACTIVE" : "ACTIVE",
                scheduledAt: schedule_later ? new Date(scheduled_at) : null,
            },
        });

        return {
            success: true,
            status: 200,
            data,
        };
    });

    // ===============================
    // DELETE GREETING (SOFT DELETE)
    // ===============================
    fastify.post("/gallery-delete", { preHandler: authMiddleware }, async (req, reply) => {
        const { id } = req.body;

        await prisma.gallery.update({
            where: { id },
            data: { status: "INACTIVE" },
        });

        return { success: true };
    });
}
