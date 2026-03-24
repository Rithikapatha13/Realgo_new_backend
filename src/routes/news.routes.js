import authMiddleware from "../middlewares/auth.middleware.js";

export default async function newsRoutes(fastify) {
    const prisma = fastify.prisma;

    // GET /api/news - General News
    fastify.get("/news", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { page = 1, size = 10, type } = request.query;
            const companyId = request.user.companyId;

            const skip = (parseInt(page) - 1) * parseInt(size);
            const take = parseInt(size);

            const where = { companyId };
            if (type) where.type = type;

            const [items, total] = await Promise.all([
                prisma.news.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { date: "desc" },
                }),
                prisma.news.count({ where }),
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

    // GET /api/news/:id
    fastify.get("/news/:id", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            const item = await prisma.news.findUnique({
                where: { id },
            });

            if (!item) {
                return reply.status(404).send({ success: false, message: "News not found" });
            }

            return reply.send({ success: true, status: 200, news: item });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // POST /api/news
    fastify.post("/news", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { title, description, date, time, newsPicture, type, source, heading } = request.body;
            const companyId = request.user.companyId;

            const news = await prisma.news.create({
                data: {
                    title,
                    description,
                    date: new Date(date),
                    time,
                    newsPicture,
                    type: type || "GENERAL",
                    source,
                    heading,
                    companyId,
                },
            });

            return reply.status(201).send({ success: true, status: 201, news });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // DELETE /api/news/:id
    fastify.delete("/news/:id", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.news.delete({ where: { id } });

            return reply.send({ success: true, message: "News deleted successfully" });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });
}
