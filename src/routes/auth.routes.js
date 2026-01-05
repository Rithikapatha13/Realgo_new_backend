export default async function authRoutes(fastify) {
  fastify.get("/user/:phone", async (req, res) => {
    const { phone } = req.params;

    if (!phone) {
      return res.code(400).send({
        message: "Phone number is required",
        success: false,
      });
    }

    try {
      const superAdmin = await fastify.prisma.superAdmin.findUnique({
        where: { phone },
      });

      if (superAdmin) {
        return res.code(200).send({
          usertype: "superadmin",
          user: superAdmin,
          success: true,
        });
      }

      const admin = await fastify.prisma.admin.findUnique({
        where: { phone },
      });

      if (admin) {
        return res.code(200).send({
          usertype: "admin",
          user: admin,
          success: true,
        });
      }

      const user = await fastify.prisma.user.findUnique({
        where: { phone },
      });

      if (!user) {
        return res.code(404).send({
          message: "User not found",
          success: false,
        });
      }

      return res.code(200).send({
        usertype: "associate",
        user: user,
        success: true,
      });
    } catch (error) {
      fastify.log.error(error);
      return res.code(500).send({
        message: "Internal server error",
        success: false,
      });
    }
  });
}
