import authMiddleware from "../middlewares/auth.middleware.js";

export default async function portraitVideoRoutes(fastify) {
    const prisma = fastify.prisma;

    // GET /api/portrait-videos
    fastify.get("/portrait-videos", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { page = 1, size = 10, search } = request.query;
            const companyId = request.user.companyId;

            const skip = (parseInt(page) - 1) * parseInt(size);
            const take = parseInt(size);

            const where = { companyId };
            if (search) {
                where.videoTitle = { contains: search, mode: "insensitive" };
            }

            const [items, total] = await Promise.all([
                prisma.portrait.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.portrait.count({ where }),
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

    // POST /api/portrait-videos
    fastify.post("/portrait-videos", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { videoTitle, videoName, videoLink, description, status } = request.body;
            const companyId = request.user.companyId;

            const portrait = await prisma.portrait.create({
                data: {
                    videoTitle,
                    videoName,
                    videoLink,
                    description,
                    status: status || "ACTIVE",
                    companyId,
                },
            });

            return reply.status(201).send({ success: true, status: 201, portrait });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // DELETE /api/portrait-videos/:id
    fastify.delete("/portrait-videos/:id", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.portrait.delete({ where: { id } });

            return reply.send({ success: true, message: "Portrait Video deleted successfully" });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });
}
