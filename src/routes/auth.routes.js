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
      const admin = await fastify.prisma.admin.findMany({
        where: { phone },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: {
            select: {
              id: true,
              company: true,
              img: true
            }
          }
        }
      });


      if (admin.length > 0) {
        return res.code(200).send({ companies: admin, role: "admin" })
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
      console.log(error)
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
      let authUser = null;
      let userType = null;

      // ---------------- SUPER ADMIN ----------------
      authUser = await fastify.prisma.superAdmin.findFirst({
        where: { phone }
      });

      if (authUser) {
        userType = "superadmin";
      }
      // ---------------- ADMIN / USER ----------------
      else {
        if (!companyId) {
          return res.code(400).send({
            success: false,
            message: "Company selection is required"
          });
        }

        authUser = await fastify.prisma.admin.findFirst({
          where: { phone, companyId }
        });

        if (authUser) {
          userType = "admin";
        } else {
          authUser = await fastify.prisma.user.findFirst({
            where: { phone, companyId }
          });
          userType = authUser ? "user" : null;
        }
      }

      if (!authUser) {
        return res.code(404).send({
          success: false,
          message: "User not found"
        });
      }

      // ---------------- PASSWORD VALIDATION ----------------
      const isValidPassword = await comparePassword(password, authUser.password);
      if (!isValidPassword) {
        return res.code(401).send({
          success: false,
          message: "Invalid credentials"
        });
      }

      // ---------------- DEFAULT PASSWORD RULE ----------------
      if (authUser.passwordChanged === false) {
        return res.code(403).send({
          success: false,
          message: "Please change your password before continuing"
        });
      }

      // ---------------- SAME PASSWORD ACROSS COMPANIES ----------------
      if (userType === "user") {
        const reusedPassword = await fastify.prisma.user.findFirst({
          where: {
            phone,
            password: authUser.password,
            NOT: { companyId }
          }
        });

        if (reusedPassword) {
          return res.code(403).send({
            success: false,
            message: "Same password cannot be used across companies"
          });
        }
      }

      // ---------------- TOKEN ----------------
      const tokenPayload = {
        userId: authUser.id,
        phone,
        userType
      };

      if (companyId) tokenPayload.companyId = companyId;
      if (authUser.role) tokenPayload.role = authUser.role;

      const token = generateToken(tokenPayload);

      return res.send({
        success: true,
        token,
        userType
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
