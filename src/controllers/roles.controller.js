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

export async function updateRole(req, reply) {
    try {
        const { id } = req.params;
        const {
            roleName,
            displayName,
            roleNo,
            modules,
            status,
        } = req.body;

        const role = await req.server.prisma.role.findUnique({
            where: { id }
        });

        if (!role) {
            return reply.code(404).send({ success: false, message: "Role not found" });
        }

        // Prevent updating critical fields for system roles if necessary, 
        // but here we just update as requested while checking for conflicts.

        const existing = await req.server.prisma.role.findFirst({
            where: {
                companyId: role.companyId,
                id: { not: id },
                OR: [{ roleName }, { roleNo }],
            },
        });

        if (existing) {
            return reply.code(409).send({
                success: false,
                message: "A role with the same name or number already exists",
            });
        }

        const updatedRole = await req.server.prisma.role.update({
            where: { id },
            data: {
                roleName,
                displayName,
                roleNo,
                modules,
                status: status || role.status,
            },
        });

        return reply.send({
            success: true,
            message: "Role updated successfully",
            data: updatedRole,
        });

    } catch (err) {
        req.log.error(err);
        return reply.code(500).send({
            success: false,
            message: "Internal server error",
        });
    }
}

export async function deleteRole(req, reply) {
    try {
        const { id } = req.params;

        const role = await req.server.prisma.role.findUnique({
            where: { id }
        });

        if (!role) {
            return reply.code(404).send({ success: false, message: "Role not found" });
        }

        // Restrictions
        const systemRoles = ["admin", "pro", "company", "accounts"];
        if (systemRoles.includes(role.roleName.toLowerCase())) {
            return reply.code(403).send({
                success: false,
                message: `Cannot delete system role: ${role.roleName}`,
            });
        }

        await req.server.prisma.role.delete({
            where: { id },
        });

        return reply.send({
            success: true,
            message: "Role deleted successfully",
        });

    } catch (err) {
        req.log.error(err);
        return reply.code(500).send({
            success: false,
            message: "Internal server error",
        });
    }
}
