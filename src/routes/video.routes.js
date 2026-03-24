import authMiddleware from "../middlewares/auth.middleware.js";

export default async function videoRoutes(fastify) {
    const prisma = fastify.prisma;

    // GET /api/videos
    fastify.get("/videos", { preHandler: authMiddleware }, async (request, reply) => {
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
                prisma.video.findMany({
                    where,
                    skip,
                    take,
                    orderBy: { createdAt: "desc" },
                }),
                prisma.video.count({ where }),
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

    // POST /api/videos
    fastify.post("/videos", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { videoTitle, videoName, videoLink, description, status } = request.body;
            const companyId = request.user.companyId;

            const video = await prisma.video.create({
                data: {
                    videoTitle,
                    videoName,
                    videoLink,
                    description,
                    status: status || "ACTIVE",
                    companyId,
                },
            });

            return reply.status(201).send({ success: true, status: 201, video });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });

    // DELETE /api/videos/:id
    fastify.delete("/videos/:id", { preHandler: authMiddleware }, async (request, reply) => {
        try {
            const { id } = request.params;
            await prisma.video.delete({ where: { id } });

            return reply.send({ success: true, message: "Video deleted successfully" });
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Internal Server Error" });
        }
    });
}
