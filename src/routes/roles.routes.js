import { createRole, updateRole, deleteRole } from "../controllers/roles.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

export default async function rolesRoutes(fastify) {
    fastify.addHook("preHandler", authMiddleware);

    // Get all roles for the current company
    fastify.get("/", async (req, reply) => {
        try {
            const { companyId } = req.user;
            const roles = await fastify.prisma.role.findMany({
                where: { companyId },
                orderBy: { roleNo: 'asc' }
            });
            return reply.send({ success: true, roles });
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
