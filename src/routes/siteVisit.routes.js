import authMiddleware from "../middlewares/auth.middleware.js";

export const siteVisitRoutes = async (fastify, options) => {
  fastify.addHook("preHandler", authMiddleware);

  fastify.get("/", async (request, reply) => {
    try {
      const companyId = request.user.companyId;
      const { userId } = request.query;

      const whereClause = {
        user: {
          companyId: companyId
        }
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const siteVisits = await fastify.prisma.siteVisit.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              companyId: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return reply.code(200).send({
        success: true,
        data: siteVisits,
        message: "Site visits fetched successfully"
      });
    } catch (error) {
      request.log.error(error);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });
};
