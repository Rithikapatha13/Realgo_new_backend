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
        message: "Phone number is required",
      });
    }

    // NORMALIZE PHONE: Handle both +91 and raw 10 digits
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneVariants = [
      phone,
      cleanPhone,
      `+91${cleanPhone}`,
      cleanPhone.slice(-10)
    ].filter(Boolean);

    try {
      // Super Admin
      const superAdmin = await fastify.prisma.superAdmin.findFirst({
        where: { phone: { in: phoneVariants } },
      });

      if (superAdmin) {
        return res.send({
          success: true,
          userType: "superadmin",
        });
      }

      // Client Admin (Owner)
      const clientAdmin = await fastify.prisma.clientAdmin.findMany({
        where: { phone: { in: phoneVariants } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: {
            select: {
              id: true,
              company: true,
              img: true,
            },
          },
        },
      });

      if (clientAdmin.length > 0) {
        return res.code(200).send({ companies: clientAdmin, role: "clientadmin" });
      }

      // Admin (Staff/Leaders)
      const admin = await fastify.prisma.admin.findMany({
        where: { phone: { in: phoneVariants } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: {
            select: {
              id: true,
              company: true,
              img: true,
            },
          },
        },
      });

      if (admin.length > 0) {
        return res.code(200).send({ companies: admin, role: "admin" });
      }


      // Telecaller (Dedicated Table)
      const telecallers = await fastify.prisma.telecaller.findMany({
        where: { phone: { in: phoneVariants } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: {
            select: {
              id: true,
              company: true,
              img: true,
            },
          },
        },
      });

      if (telecallers.length > 0) {
        return res.code(200).send({ companies: telecallers, role: "telecaller" });
      }

      // User (multi-company)
      const users = await fastify.prisma.user.findMany({
        where: { phone: { in: phoneVariants } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          company: {
            select: {
              id: true,
              company: true,
              img: true,
            },
          },
        },
      });

      if (!users.length) {
        return res.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      return res.send({
        success: true,
        userType: "user",
        companies: users,
      });
    } catch (error) {
      console.log(error);
      return res.code(500).send({
        success: false,
        message: "Internal server error",
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
        message: "Phone and password are required",
      });
    }

    try {
      let authUser = null;
      let userType = null;

      const cleanPhone = phone.replace(/\D/g, "");
      const phoneVariants = [
        phone,
        cleanPhone,
        `+91${cleanPhone}`,
        cleanPhone.slice(-10)
      ].filter(Boolean);

      // ---------------- SUPER ADMIN ----------------
      authUser = await fastify.prisma.superAdmin.findFirst({
        where: { phone: { in: phoneVariants } },
      });

      if (authUser) {
        userType = "superadmin";
        authUser.roleName = "superadmin";
      }
      // ---------------- ADMIN / USER ----------------
      else {
        if (!companyId) {
          return res.code(400).send({
            success: false,
            message: "Company selection is required",
          });
        }

        authUser = await fastify.prisma.clientAdmin.findFirst({
          where: { phone: { in: phoneVariants }, companyId },
          include: {
            company: {
              select: {
                img: true,
                company: true,
                primaryColour: true,
                secondaryColour: true,
              },
            },
          },
        });

        if (authUser) {
          userType = "clientadmin";
          authUser.role = { 
            roleName: "COMPANY_ADMIN",
            modules: ["ALL"], // ClientAdmin gets all modules
            roleNo: 0 
          }; // Map virtual role
        } else {
          authUser = await fastify.prisma.admin.findFirst({
            where: { phone: { in: phoneVariants }, companyId },
            include: {
              company: {
                select: {
                  img: true,
                  company: true,
                  primaryColour: true,
                  secondaryColour: true,
                },
              },
              role: {
                select: {
                  roleName: true,
                  modules: true,
                  roleNo: true,
                },
              },
            },
          });
        }

        if (authUser && !userType) {
          userType = "admin";
        } else if (!authUser) {
          // ---------------- TELECALLER (Dedicated Table) ----------------
          authUser = await fastify.prisma.telecaller.findFirst({
            where: { phone: { in: phoneVariants }, companyId },
            include: {
              company: {
                select: {
                  img: true,
                  company: true,
                  primaryColour: true,
                  secondaryColour: true,
                },
              },
              role: {
                select: {
                  roleName: true,
                  modules: true,
                  roleNo: true,
                },
              },
            },
          });

          if (authUser) {
            userType = "telecaller";
          } else {
            // ---------------- USER (Associates) ----------------
            authUser = await fastify.prisma.user.findFirst({
              where: { phone: { in: phoneVariants }, companyId },
              include: {
                company: {
                  select: {
                    img: true,
                    company: true,
                    primaryColour: true,
                    secondaryColour: true,
                  },
                },
                role: {
                  select: {
                    roleName: true,
                    modules: true,
                    roleNo: true,
                  },
                },
              },
            });
            userType = authUser ? "associate" : null;
          }
        }
      }

      if (!authUser) {
        return res.code(404).send({
          success: false,
          message: "User not found",
        });
      }

      // ---------------- PASSWORD VALIDATION ----------------
      const isValidPassword = await comparePassword(
        password,
        authUser.password,
      );
      if (!isValidPassword) {
        return res.code(401).send({
          success: false,
          message: "Invalid credentials",
        });
      }

      // ---------------- DEFAULT PASSWORD RULE ----------------
      if (authUser.passwordChanged === false) {
        return res.code(403).send({
          success: false,
          message: "Please change your password before continuing",
        });
      }

      // ---------------- SAME PASSWORD ACROSS COMPANIES ----------------
      if (userType === "user") {
        const reusedPassword = await fastify.prisma.user.findFirst({
          where: {
            phone,
            password: authUser.password,
            NOT: { companyId },
          },
        });

        if (reusedPassword) {
          return res.code(403).send({
            success: false,
            message: "Same password cannot be used across companies",
          });
        }
      }

      // ---------------- TOKEN ----------------
      const tokenPayload = {
        userId: authUser.id,
        phone,
        userType,
      };

      if (companyId) tokenPayload.companyId = companyId;
      if (authUser.role) {
        tokenPayload.role = authUser.role;
        tokenPayload.roleId = authUser.roleId;
        tokenPayload.roleNo = authUser.role.roleNo;
        tokenPayload.roleModules = authUser.role.modules;
      }

      const user = {
        id: authUser.id,
        userAuthId: authUser.userAuthId,
        firstName: authUser.firstName,
        lastName: authUser.lastName,
        phone: authUser.phone,
        email: authUser.email,
        image: authUser.image,
        companyId: authUser.companyId,
        companyName: authUser.company?.company,
        referId: authUser.referId,
        teamHeadId: authUser.teamHeadId,
        role: authUser.roleName || authUser.role?.roleName,
        roleId: authUser.roleId,
        roleModules: authUser.role?.modules || [],
        roleNo: authUser.role?.roleNo || (userType === 'clientadmin' ? 0 : 999),
        userName: authUser.username,
        companyImg: authUser.company?.img,
        primaryColour: authUser.company?.primaryColour,
        secondaryColour: authUser.company?.secondaryColour,
      };

      const token = generateToken(tokenPayload);

      return res.send({
        success: true,
        user,
        token,
        userType,
      });
    } catch (error) {
      fastify.log.error(error);
      return res.code(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  });
  // console.log(token)


  // =====================================================
  // CHANGE PASSWORD (Support both hyphen and underscore)
  // =====================================================
  const changePasswordHandler = async (req, res) => {
    const { phone, companyId, oldPassword, newPassword } = req.body;

    if (!phone || !companyId || !newPassword) {
      return res.code(400).send({
        success: false,
        message: "All fields are required",
      });
    }

    // NORMALIZE PHONE
    const cleanPhone = phone.replace(/\D/g, "");
    const phoneVariants = [
      phone,
      cleanPhone,
      `+91${cleanPhone}`,
      cleanPhone.slice(-10)
    ].filter(Boolean);

    try {
      /* =========================
       1️⃣ CHECK ADMIN FIRST
    ========================== */
      const admin = await fastify.prisma.admin.findFirst({
        where: { phone: { in: phoneVariants }, companyId },
      });

      if (admin) {
        if (oldPassword) {
          const isOldPasswordValid = await comparePassword(oldPassword, admin.password);
          if (!isOldPasswordValid) {
            return res.code(401).send({ success: false, message: "Current password is incorrect" });
          }
        }

        const hashedPassword = await hashPassword(newPassword);

        await fastify.prisma.admin.update({
          where: { id: admin.id },
          data: {
            password: hashedPassword,
            passwordChanged: true,
          },
        });

        return res.send({
          success: true,
          message: "Password changed successfully! Please login with your new password.",
          role: "admin",
        });
      }

      /* =========================
       2️⃣ CHECK CLIENT ADMIN
    ========================== */
      const clientAdmin = await fastify.prisma.clientAdmin.findFirst({
        where: { phone: { in: phoneVariants }, companyId },
      });

      if (clientAdmin) {
        if (oldPassword) {
          const isOldPasswordValid = await comparePassword(oldPassword, clientAdmin.password);
          if (!isOldPasswordValid) {
            return res.code(401).send({ success: false, message: "Current password is incorrect" });
          }
        }

        const hashedPassword = await hashPassword(newPassword);

        await fastify.prisma.clientAdmin.update({
          where: { id: clientAdmin.id },
          data: {
            password: hashedPassword,
            passwordChanged: true,
          },
        });

        return res.send({
          success: true,
          message: "Password changed successfully! Please login with your new password.",
          role: "clientadmin",
        });
      }

      /* =========================
       3️⃣ CHECK TELECALLER
    ========================== */
      const telecaller = await fastify.prisma.telecaller.findFirst({
        where: { phone: { in: phoneVariants }, companyId },
      });

      if (telecaller) {
        if (oldPassword) {
          const isOldPasswordValid = await comparePassword(oldPassword, telecaller.password);
          if (!isOldPasswordValid) {
            return res.code(401).send({ success: false, message: "Current password is incorrect" });
          }
        }

        const hashedPassword = await hashPassword(newPassword);

        await fastify.prisma.telecaller.update({
          where: { id: telecaller.id },
          data: {
            password: hashedPassword,
            passwordChanged: true,
          },
        });

        return res.send({
          success: true,
          message: "Password changed successfully! Please login with your new password.",
          role: "telecaller",
        });
      }

      /* =========================
       4️⃣ FALLBACK TO USER (Associate)
    ========================== */
      const user = await fastify.prisma.user.findFirst({
        where: { phone: { in: phoneVariants }, companyId },
      });

      if (!user) {
        return res.code(404).send({
          success: false,
          message: "Admin or User not found",
        });
      }

      if (oldPassword) {
        const isOldPasswordValid = await comparePassword(oldPassword, user.password);
        if (!isOldPasswordValid) {
          return res.code(401).send({ success: false, message: "Current password is incorrect" });
        }
      }

      const hashedPassword = await hashPassword(newPassword);

      await fastify.prisma.user.update({
        where: { id: user.id },
        data: {
          password: hashedPassword,
          passwordChanged: true,
        },
      });

      return res.send({
        success: true,
        message: "Password changed successfully! Please login with your new password.",
        role: "user",
      });
    } catch (error) {
      fastify.log.error(error);
      return res.code(500).send({
        success: false,
        message: "Internal server error",
      });
    }
  };

  fastify.post("/change-password", changePasswordHandler);
  fastify.post("/change_password", changePasswordHandler);
}
