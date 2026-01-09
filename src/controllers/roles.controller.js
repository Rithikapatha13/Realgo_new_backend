import { randomUUID } from "crypto";

export async function createRole(req, reply) {
    try {
        const {
            roleName,
            displayName,
            roleNo,
            modules,
            companyId,
            companyName,
        } = req.body;

        if (
            !roleName ||
            !displayName ||
            !roleNo ||
            !companyId ||
            !companyName ||
            !Array.isArray(modules)
        ) {
            return reply.code(400).send({
                success: false,
                message: "Invalid request data",
            });
        }

        const existing = await req.server.prisma.role.findFirst({
            where: {
                companyId,
                OR: [{ roleName }, { roleNo }],
            },
        });

        if (existing) {
            return reply.code(409).send({
                success: false,
                message: "Role already exists",
            });
        }

        const role = await req.server.prisma.role.create({
            data: {
                id: randomUUID(),
                roleName,
                displayName,
                roleNo,
                companyId,
                companyName,
                status: "ACTIVE",
                modules,
            },
        });

        return reply.code(201).send({
            success: true,
            message: "Role created successfully",
            data: role,
        });

    } catch (err) {
        req.log.error(err);
        return reply.code(500).send({
            success: false,
            message: "Internal server error",
        });
    }
}
