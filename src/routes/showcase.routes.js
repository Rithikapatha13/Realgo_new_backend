import authMiddleware from "../middlewares/auth.middleware.js";

export default async function showcaseRoutes(fastify) {
    const prisma = fastify.prisma;

    // GET /api/showcases
    fastify.get("/showcases", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { page = 1, size = 10, category } = request.query;
            const companyId = request.user.companyId;

            const skip = (parseInt(page) - 1) * parseInt(size);
            const take = parseInt(size);

            const where = { companyId };
            if (category) where.fileCategory = category;

            const [items, total] = await Promise.all([
                prisma.showcase.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.showcase.count({ where }),
            ]);

            return reply.send({
                success: true,
                status: 200,
                items,
                total,
                pageNumber: parseInt(page),
                pageLimit: parseInt(size),
            });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // POST /api/showcases
    fastify.post("/showcases", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { fileName, fileCategory, platform, status } = request.body;
            const companyId = request.user.companyId;

            const showcase = await prisma.showcase.create({
                data: {
                    fileName,
                    fileCategory,
                    platform,
                    status: status || "VERIFIED",
                    companyId,
                },
            });

            return reply.status(201).send({ success: true, status: 201, showcase });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // PATCH /api/showcases/:id
    fastify.patch("/showcases/:id", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { status } = request.body;

            const updated = await prisma.showcase.update({
                where: { id },
                data: { status },
            });

            return reply.send({ success: true, showcase: updated });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // DELETE /api/showcases/:id
    fastify.delete("/showcases/:id", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.showcase.delete({ where: { id } });

            return reply.send({ success: true, message: "Showcase deleted successfully" });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });
}
