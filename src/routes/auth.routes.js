import { generateToken } from "../utils/jwt.js";
import { comparePassword, hashPassword } from "../utils/password.js";

export default async function authRoutes(fastify) {

  // =====================================================
  // IDENTIFY USER BY PHONE
  // =====================================================
  fastify.get("/identify/:phone", async (req, res) => {
    const { phone } = req.params;

    if (!phone) {
      return res.code(400).send({
        success: false,
        message: "Phone number is required"
      });
    }

    try {
      // Super Admin
      const superAdmin = await fastify.prisma.superAdmin.findFirst({
        where: { phone }
      });

      if (superAdmin) {
        return res.send({
          success: true,
          userType: "superadmin"
        });
      }

      // Admin
      const admin = await fastify.prisma.admin.findFirst({
        where: { phone }
      });

      if (admin) {
        return res.send({
          success: true,
          userType: "user",
          companies: [{ companyId: admin.companyId }]
        });
      }

      // User (multi-company)
      const users = await fastify.prisma.user.findMany({
        where: { phone },
        select: {
          companyId: true
        }
      });

      if (!users.length) {
        return res.code(404).send({
          success: false,
          message: "User not found"
        });
      }

      return res.send({
        success: true,
        userType: "user",
        companies: users
      });

    } catch (error) {
      fastify.log.error(error);
      return res.code(500).send({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // =====================================================
  // LOGIN
  // =====================================================
  fastify.post("/login", async (req, res) => {
    const { phone, password, companyId } = req.body;

    if (!phone || !password) {
      return res.code(400).send({
        success: false,
        message: "Phone and password are required"
      });
    }

    try {
      // ---------------- SUPER ADMIN ----------------
      const superAdmin = await fastify.prisma.superAdmin.findFirst({
        where: { phone }
      });

      if (superAdmin) {
        const valid = await comparePassword(password, superAdmin.password);
        if (!valid) {
          return res.code(401).send({
            success: false,
            message: "Invalid credentials"
          });
        }

        const token = generateToken({
          userId: superAdmin.id,
          phone,
          userType: "superadmin"
        });

        return res.send({
          success: true,
          token,
          userType: "superadmin"
        });
      }

      // ---------------- ADMIN / USER ----------------
      if (!companyId) {
        return res.code(400).send({
          success: false,
          message: "Company selection is required"
        });
      }

      const user = await fastify.prisma.user.findFirst({
        where: { phone, companyId }
      });

      if (!user) {
        return res.code(404).send({
          success: false,
          message: "User not found for selected company"
        });
      }

      const validPassword = await comparePassword(password, user.password);
      if (!validPassword) {
        return res.code(401).send({
          success: false,
          message: "Invalid credentials"
        });
      }

      // Default password rule
      if (!user.passwordChanged) {
        return res.code(403).send({
          success: false,
          message: "Please change your password before continuing"
        });
      }

      // Same password across companies check
      const reusedPassword = await fastify.prisma.user.findFirst({
        where: {
          phone,
          password: user.password,
          NOT: { companyId }
        }
      });

      if (reusedPassword) {
        return res.code(403).send({
          success: false,
          message: "Same password cannot be used across companies"
        });
      }

      const token = generateToken({
        userId: user.id,
        phone,
        userType: "user",
        companyId,
        role: user.role
      });

      return res.send({
        success: true,
        token,
        userType: "user"
      });

    } catch (error) {
      fastify.log.error(error);
      return res.code(500).send({
        success: false,
        message: "Internal server error"
      });
    }
  });

  // =====================================================
  // CHANGE PASSWORD
  // =====================================================
  fastify.post("/change-password", async (req, res) => {
    const { phone, companyId, oldPassword, newPassword } = req.body;

    if (!phone || !companyId || !oldPassword || !newPassword) {
      return res.code(400).send({
        success: false,
        message: "All fields are required"
      });
    }

    try {
      const user = await fastify.prisma.user.findFirst({
        where: { phone, companyId }
      });

      if (!user) {
        return res.code(404).send({
          success: false,
          message: "User not found"
        });
      }

      const valid = await comparePassword(oldPassword, user.password);
      if (!valid) {
        return res.code(401).send({
          success: false,
          message: "Old password is incorrect"
        });
      }

      const newHashedPassword = await hashPassword(newPassword);

      // Prevent reuse across companies
      const reused = await fastify.prisma.user.findFirst({
        where: {
          phone,
          password: newHashedPassword,
          NOT: { companyId }
        }
      });

      if (reused) {
        return res.code(403).send({
          success: false,
          message: "Password already used in another company"
        });
      }

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          password: newHashedPassword,
          passwordChanged: true
        }
      });

      return res.send({
        success: true,
        message: "Password changed successfully"
      });

    } catch (error) {
      fastify.log.error(error);
      return res.code(500).send({
        success: false,
        message: "Internal server error"
      });
    }
  });
}
