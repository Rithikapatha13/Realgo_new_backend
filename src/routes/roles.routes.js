import { createRole } from "../controllers/roles.controller.js";
import authMiddleware from "../middlewares/auth.middleware.js";

export default async function rolesRoutes(fastify) {
    // fastify.addHook("preHandler", authMiddleware);

    fastify.post("/", createRole);
}
