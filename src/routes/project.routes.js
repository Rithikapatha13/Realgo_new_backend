import authMiddleware from "../middlewares/auth.middleware.js";

export async function projectRoutes(fastify) {
    // GET /api/highways - Fetch all highways for the current company
    fastify.get("/highways", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const highways = await fastify.prisma.highway.findMany({
                where: { companyId },
                orderBy: { highwayName: "asc" },
            });
            return { success: true, items: highways, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching highways" });
        }
    });

    // GET /api/projects - Fetch projects filtered by highwayId
    fastify.get("/projects", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const { highwayId, name } = req.query;

            const condition = { companyId };
            if (highwayId) condition.highwayId = highwayId;
            if (name) {
                condition.projectName = {
                    contains: name,
                    mode: 'insensitive'
                };
            }

            const projects = await fastify.prisma.project.findMany({
                where: condition,
                include: {
                    highway: {
                        select: { highwayName: true }
                    }
                },
                orderBy: { createdAt: "desc" },
            });

            // Calculate available plots for each project
            const projectsWithPlots = await Promise.all(
                projects.map(async (project) => {
                    const availablePlotsCount = await fastify.prisma.plot.count({
                        where: {
                            projectId: project.id,
                            status: "AVAILABLE",
                        },
                    });
                    return {
                        ...project,
                        availablePlots: availablePlotsCount,
                    };
                })
            );

            return { success: true, items: projectsWithPlots, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching projects" });
        }
    });

    // GET /api/projects/:id - Fetch a single project by ID with all details
    fastify.get("/projects/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const project = await fastify.prisma.project.findUnique({
                where: { id },
                include: {
                    highway: true
                }
            });

            if (!project) {
                return res.code(404).send({ success: false, message: "Project not found" });
            }

            const availablePlotsCount = await fastify.prisma.plot.count({
                where: {
                    projectId: id,
                    status: "AVAILABLE",
                },
            });

            return {
                success: true,
                project: {
                    ...project,
                    availablePlots: availablePlotsCount
                },
                status: 200
            };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching project details" });
        }
    });

    // PUT /api/projects/:id - Update an existing project
    fastify.put("/projects/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { id } = req.params;
            const { companyId } = req.user;
            const body = req.body;

            // Ensure the project exists and belongs to the same company
            const existingProject = await fastify.prisma.project.findUnique({
                where: { id },
            });

            if (!existingProject || existingProject.companyId !== companyId) {
                return res.code(404).send({ success: false, message: "Project not found or unauthorized" });
            }

            // Prepare update data
            const updateData = {
                projectName: body.projectName,
                projectAddress: body.projectAddress,
                projectDescription: body.projectDescription,
                latitude: body.latitude,
                longitude: body.longitude,
                projectVirtualViewLink: body.projectVirtualViewLink,
                projectWebsiteUrl: body.projectWebsiteUrl,
                projectImage: body.projectImage,
                qrCode: body.qrCode,
                highwayId: body.highwayId,
                // Array fields - pass directly for String[] in PostgreSQL
                sliders: body.sliders,
                images: body.images,
                brochures: body.brochures,
                flyers: body.flyers,
                videos: body.videos,
                layoutImage: body.layoutImage,
                highlights: body.highlights,
                approvals: body.approvals,
                approvalCopies: body.approvalCopies,
                locationHighlights: body.locationHighlights,
                incentivesLevel: body.incentivesLevel,
            };

            const updatedProject = await fastify.prisma.project.update({
                where: { id },
                data: updateData,
            });

            return { success: true, message: "Project updated successfully", project: updatedProject, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error updating project" });
        }
    });
}
