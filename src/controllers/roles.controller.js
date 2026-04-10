import { randomUUID } from "crypto";

export async function createRole(req, reply) {
    try {
        let {
            roleName,
            displayName,
            roleNo,
            modules,
            companyId,
            companyName,
        } = req.body;

        if (!roleName || !displayName || !roleNo || !companyId || !Array.isArray(modules)) {
            return reply.code(400).send({
                success: false,
                message: "Invalid request data: Missing required fields",
            });
        }

        if (!companyName) {
            const company = await req.server.prisma.company.findUnique({ where: { id: companyId }});
            companyName = company?.company || "Unknown Company";
        }

        const existingName = await req.server.prisma.role.findFirst({
            where: { companyId, roleName },
        });

        if (existingName) {
            return reply.code(409).send({
                success: false,
                message: "Role name already exists",
            });
        }

        const existingNo = await req.server.prisma.role.findFirst({
            where: { companyId, roleNo },
        });

        if (existingNo) {
            return reply.code(409).send({
                success: false,
                message: "Role number already exists",
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
        
        let orConditions = [];
        if (roleName) orConditions.push({ roleName });
        if (roleNo !== undefined && roleNo !== null && !isNaN(roleNo)) orConditions.push({ roleNo });

        if (orConditions.length > 0) {
            const existing = await req.server.prisma.role.findFirst({
                where: {
                    companyId: role.companyId,
                    id: { not: id },
                    OR: orConditions,
                },
            });
    
            if (existing) {
                return reply.code(409).send({
                    success: false,
                    message: "A role with the same name or number already exists",
                });
            }
        }

        const updatedRole = await req.server.prisma.role.update({
            where: { id },
            data: {
                roleName: roleName !== undefined ? roleName : role.roleName,
                displayName: displayName !== undefined ? displayName : role.displayName,
                roleNo: (roleNo !== undefined && !isNaN(roleNo)) ? roleNo : role.roleNo,
                modules: modules !== undefined ? modules : role.modules,
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

        // Prevent deletion if the role is assigned to any Admins or Users
        const assignedAdminsCount = await req.server.prisma.admin.count({ where: { roleId: id } });
        const assignedUsersCount = await req.server.prisma.user.count({ where: { roleId: id } });

        if (assignedAdminsCount > 0 || assignedUsersCount > 0) {
            return reply.code(409).send({ 
                success: false, 
                message: "Cannot delete this role because it is currently assigned to active staff." 
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
