import { createRole, updateRole, deleteRole } from "../controllers/roles.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

export default async function rolesRoutes(fastify) {
    fastify.addHook("preHandler", authMiddleware);

    // Get all roles for the current company with hierarchy filtering
    fastify.get("/", async (req, reply) => {
        try {
            const { companyId, userType, roleModules } = req.user;
            
            // Fetch all roles for the company
            const allRoles = await fastify.prisma.role.findMany({
                where: { companyId },
                orderBy: { roleNo: 'asc' }
            });

            // If Client Admin, they see everything
            if (userType === 'clientadmin') {
                return reply.send({ success: true, roles: allRoles });
            }

            // For other Admins, apply functional filtering
            const hasCrmAccess = roleModules.includes("CRM") || roleModules.includes("TELECALLER");

            const filteredRoles = allRoles.filter(role => {
                const targetModules = role.modules || [];
                
                // 1. Never show "Management" roles to regular admins
                // Management roles are identified by having ADMIN or ROLES modules
                const isManagementRole = targetModules.some(m => ["ADMIN", "ROLES"].includes(m.toUpperCase()));
                if (isManagementRole) return false;

                // 2. Functional isolation
                if (!hasCrmAccess) {
                    // Marketing/General Admin: Should NOT see Telecaller specific roles (those with CRM module)
                    // They should only see Associate-like roles
                    const isCrmRole = targetModules.some(m => m.toUpperCase() === "CRM");
                    if (isCrmRole) return false;
                }

                // Telecaller Admin (hasCrmAccess): 
                // Sees both CRM roles AND Associate roles (non-management roles)
                
                return true;
            });

            return reply.send({ success: true, roles: filteredRoles });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get a specific role by ID
    fastify.get("/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const role = await fastify.prisma.role.findUnique({
                where: { id }
            });
            if (!role) {
                return reply.code(404).send({ success: false, message: "Role not found" });
            }
            return reply.send({ success: true, items: { role: role.roleNo, ...role } });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    fastify.post("/", createRole);
    fastify.put("/:id", updateRole);
    fastify.delete("/:id", deleteRole);
}
