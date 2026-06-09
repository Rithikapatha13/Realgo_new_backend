import authMiddleware from "../middlewares/auth.middleware.js";

export async function phaseRoutes(fastify) {

    // GET /api/phases - Fetch all phases for a given project (or entire company)
    fastify.get("/phases", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const { projectId } = req.query;

            const where = {};

            // Filter by projectId via the project relation (which is scoped to companyId)
            if (projectId) {
                where.projectId = projectId;
                // Ensure this project belongs to the current company
                const project = await fastify.prisma.project.findUnique({
                    where: { id: projectId },
                    select: { companyId: true },
                });
                if (!project || project.companyId !== companyId) {
                    return res.code(404).send({ success: false, message: "Project not found or unauthorized" });
                }
            } else {
                // If no projectId, filter via the project relation
                where.project = { companyId };
            }

            const phases = await fastify.prisma.phase.findMany({
                where,
                include: {
                    project: {
                        select: { projectName: true }
                    },
                    _count: { select: { plots: true } }
                },
                orderBy: { createdAt: "asc" },
            });

            return { success: true, items: phases, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching phases" });
        }
    });

    // GET /api/phases/:id - Fetch a single phase by ID
    fastify.get("/phases/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;

            const phase = await fastify.prisma.phase.findUnique({
                where: { id },
                include: {
                    project: { select: { projectName: true, companyId: true } },
                    _count: { select: { plots: true } }
                }
            });

            if (!phase || phase.project.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Phase not found" });
            }

            return { success: true, item: phase, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching phase details" });
        }
    });

    // POST /api/phases - Create a new phase
    fastify.post("/phases", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const { phaseName, projectId } = req.body;

            if (!phaseName || !projectId) {
                return res.code(400).send({ success: false, message: "Phase name and project ID are required" });
            }

            // Verify project belongs to company
            const project = await fastify.prisma.project.findUnique({
                where: { id: projectId },
                select: { companyId: true },
            });

            if (!project || project.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Project not found or unauthorized" });
            }

            const newPhase = await fastify.prisma.phase.create({
                data: {
                    phaseName,
                    projectId,
                },
                include: {
                    project: { select: { projectName: true } }
                }
            });

            return { success: true, message: "Phase created successfully", item: newPhase, status: 201 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error creating phase" });
        }
    });

    // PUT /api/phases/:id - Update a phase
    fastify.put("/phases/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;
            const { phaseName, projectId } = req.body;

            const existingPhase = await fastify.prisma.phase.findUnique({
                where: { id },
                include: { project: { select: { companyId: true } } }
            });

            if (!existingPhase || existingPhase.project.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Phase not found or unauthorized" });
            }

            const updateData = {};
            if (phaseName !== undefined) updateData.phaseName = phaseName;
            if (projectId !== undefined) {
                // Validate new project also belongs to company
                const project = await fastify.prisma.project.findUnique({
                    where: { id: projectId },
                    select: { companyId: true },
                });
                if (!project || project.companyId !== companyId) {
                    return res.code(404).send({ success: false, message: "Project not found or unauthorized" });
                }
                updateData.projectId = projectId;
            }

            const updatedPhase = await fastify.prisma.phase.update({
                where: { id },
                data: updateData,
                include: {
                    project: { select: { projectName: true } }
                }
            });

            return { success: true, message: "Phase updated successfully", item: updatedPhase, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error updating phase" });
        }
    });

    // DELETE /api/phases/:id - Delete a phase
    fastify.delete("/phases/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;

            const existingPhase = await fastify.prisma.phase.findUnique({
                where: { id },
                include: {
                    project: { select: { companyId: true } },
                    _count: { select: { plots: true } }
                }
            });

            if (!existingPhase || existingPhase.project.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Phase not found or unauthorized" });
            }

            if (existingPhase._count.plots > 0) {
                return res.code(400).send({
                    success: false,
                    message: `Cannot delete phase. It is currently linked to ${existingPhase._count.plots} plot(s). Please reassign them first.`
                });
            }

            await fastify.prisma.phase.delete({ where: { id } });

            return { success: true, message: "Phase deleted successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error deleting phase" });
        }
    });
}
