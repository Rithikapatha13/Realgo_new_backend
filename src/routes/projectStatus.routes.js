import authMiddleware from "../middlewares/auth.middleware.js";

export async function projectStatusRoutes(fastify) {
    // GET /api/project-statuses - Fetch all statuses for the current company
    fastify.get("/project-statuses", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const statuses = await fastify.prisma.projectStatus.findMany({
                where: { companyId },
                orderBy: { statusName: "asc" },
            });
            return { success: true, items: statuses, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching project statuses" });
        }
    });

    // GET /api/project-statuses/:id - Fetch a single status by ID
    fastify.get("/project-statuses/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;

            const status = await fastify.prisma.projectStatus.findUnique({
                where: { id },
            });

            if (!status || status.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Project status not found" });
            }

            return { success: true, item: status, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching project status details" });
        }
    });

    // POST /api/project-statuses - Create a new status
    fastify.post("/project-statuses", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const { statusName, statusIcon } = req.body;

            if (!statusName) {
                return res.code(400).send({ success: false, message: "Status name is required" });
            }

            const newStatus = await fastify.prisma.projectStatus.create({
                data: {
                    statusName,
                    statusIcon,
                    companyId,
                },
            });

            return { success: true, message: "Project status created successfully", item: newStatus, status: 201 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error creating project status" });
        }
    });

    // PUT /api/project-statuses/:id - Update an existing status
    fastify.put("/project-statuses/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;
            const { statusName, statusIcon } = req.body;

            const existingStatus = await fastify.prisma.projectStatus.findUnique({
                where: { id },
            });

            if (!existingStatus || existingStatus.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Project status not found or unauthorized" });
            }

            const updatedStatus = await fastify.prisma.projectStatus.update({
                where: { id },
                data: {
                    statusName: statusName !== undefined ? statusName : existingStatus.statusName,
                    statusIcon: statusIcon !== undefined ? statusIcon : existingStatus.statusIcon,
                },
            });

            return { success: true, message: "Project status updated successfully", item: updatedStatus, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error updating project status" });
        }
    });

    // DELETE /api/project-statuses/:id - Delete a status
    fastify.delete("/project-statuses/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;

            const existingStatus = await fastify.prisma.projectStatus.findUnique({
                where: { id },
                include: { projects: true }
            });

            if (!existingStatus || existingStatus.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Project status not found or unauthorized" });
            }

            if (existingStatus.projects.length > 0) {
                return res.code(400).send({ 
                    success: false, 
                    message: `Cannot delete status. It is currently linked to ${existingStatus.projects.length} project(s).` 
                });
            }

            await fastify.prisma.projectStatus.delete({
                where: { id },
            });

            return { success: true, message: "Project status deleted successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error deleting project status" });
        }
    });
}
