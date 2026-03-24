import authMiddleware from "../middlewares/auth.middleware.js";

export async function plotRoutes(fastify) {

    // ===================== GET /api/plots  (paginated, filtered list) =====================
    fastify.get("/plots-list", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const {
                page = 0,
                size = 12,
                project,
                plotNumber,
                status,
                category,
                sqrSize,
                facing,
                phases,
                associate,
            } = req.query;

            const pageNum = parseInt(page, 10);
            const pageSize = parseInt(size, 10);
            const skip = pageNum * pageSize;

            // Build where clause
            const where = { companyId };
            if (project) where.projectId = project;
            if (status) where.status = status;
            if (category) where.plotCategory = category;
            if (facing) where.facing = facing;
            if (associate) where.associateId = associate;

            if (plotNumber) {
                where.plotNumber = { contains: plotNumber, mode: "insensitive" };
            }

            // Phase filter – the old model stored phase as a string on the plot itself.
            // The new model has phaseId. We try to match by phase name via relation.
            if (phases) {
                where.phase = { phaseName: phases };
            }

            // sqrSize range filter  e.g. "150-200"  or "1000-"
            if (sqrSize) {
                const parts = sqrSize.split("-");
                const min = parseFloat(parts[0]) || 0;
                const max = parts[1] ? parseFloat(parts[1]) : undefined;
                where.sqrYards = max ? { gte: min, lte: max } : { gte: min };
            }

            const [items, totalCount] = await Promise.all([
                fastify.prisma.plot.findMany({
                    where,
                    select: {
                        id: true,
                        plotNumber: true,
                        projectName: true,
                        plotCategory: true,
                        facing: true,
                        sqrYards: true,
                        status: true,
                        phaseId: true,
                        phase: { select: { phaseName: true } },
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: pageSize,
                }),
                fastify.prisma.plot.count({ where }),
            ]);

            // Map phase name onto each item for convenience
            const mapped = items.map((p) => ({
                ...p,
                phases: p.phase?.phaseName || null,
            }));

            return {
                success: true,
                status: 200,
                total: totalCount,
                items: mapped,
                pageNumber: pageNum,
                pageLimit: pageSize,
            };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching plots" });
        }
    });

    // ===================== GET /api/plot/:id =====================
    fastify.get("/plot/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const plot = await fastify.prisma.plot.findUnique({
                where: { id: req.params.id },
                include: {
                    project: true,
                    phase: true,
                },
            });
            if (!plot) return res.code(404).send({ success: false, message: "Plot not found" });
            return { success: true, plot, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching plot" });
        }
    });

    // ===================== POST /api/plot  (create) =====================
    fastify.post("/plot", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const body = req.body;

            // Check for duplicate
            const existing = await fastify.prisma.plot.findFirst({
                where: {
                    projectId: body.projectId,
                    plotNumber: body.plotNumber,
                    phaseId: body.phaseId || undefined,
                    companyId,
                },
            });

            if (existing) {
                return res.code(400).send({
                    success: false,
                    message: `Plot ${body.plotNumber} already exists in this project/phase`,
                });
            }

            let point = null;
            if (body.latitude && body.longitude) {
                point = JSON.stringify([body.latitude, body.longitude]);
            }

            await fastify.prisma.plot.create({
                data: {
                    facing: body.facing,
                    sqrYards: parseFloat(body.sqrYards) || 0,
                    phaseId: body.phaseId || null,
                    plotCategory: body.plotCategory,
                    plotNumber: body.plotNumber,
                    customerName: body.customerName || null,
                    paidAmount: body.paidAmount || null,
                    projectId: body.projectId,
                    projectName: body.projectName,
                    companyId,
                    point: point,
                    status: "AVAILABLE",
                },
            });

            return { success: true, message: "Plot created successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error creating plot" });
        }
    });

    // ===================== PUT /api/plot/:id  (update) =====================
    fastify.put("/plot/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const body = req.body;
            let point = null;
            if (body.latitude && body.longitude) {
                point = JSON.stringify([body.latitude, body.longitude]);
            }

            await fastify.prisma.plot.update({
                where: { id: req.params.id },
                data: {
                    facing: body.facing,
                    sqrYards: parseFloat(body.sqrYards) || undefined,
                    phaseId: body.phaseId || undefined,
                    plotCategory: body.plotCategory,
                    plotNumber: body.plotNumber,
                    customerName: body.customerName,
                    paidAmount: body.paidAmount,
                    projectId: body.projectId,
                    projectName: body.projectName,
                    point: point,
                },
            });

            return { success: true, message: "Plot updated successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error updating plot" });
        }
    });

    // ===================== DELETE /api/plot/:id =====================
    fastify.delete("/plot/:id", { preHandler: authMiddleware }, async (req, res) => {
        try {
            await fastify.prisma.plot.delete({ where: { id: req.params.id } });
            return { success: true, message: "Plot deleted", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error deleting plot" });
        }
    });

    // ===================== POST /api/plot-status  (change status) =====================
    fastify.post("/plot-status", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const body = req.body;
            if (!body.id || !body.status) {
                return res.code(400).send({ success: false, message: "Plot ID and status are required" });
            }

            const updateData = {
                status: body.status,
                reasonForRejection: body.reason_for_rejection || body.reasonForRejection || null,
            };

            // If resetting to AVAILABLE, clear all booking/registration fields
            if (body.status === "AVAILABLE") {
                Object.assign(updateData, {
                    customerName: null,
                    customerContact: null,
                    customerAddress: null,
                    totalCost: null,
                    paidAmount: null,
                    remainingAmount: null,
                    paymentImage: null,
                    aadhar: null,
                    referId: null,
                    teamHeadId: null,
                    associateId: null,
                    associateUserAuthId: null,
                    bookingDate: null,
                    registeredDate: null,
                    paymentType: null,
                    pbNumber: null,
                    plotBookingPlan: null,
                    paymentMode: null,
                });
            }

            await fastify.prisma.plot.update({
                where: { id: body.id },
                data: updateData,
            });

            return { success: true, message: "Plot status updated successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error updating plot status" });
        }
    });

    // ===================== POST /api/booking-plot  (book a plot) =====================
    fastify.post("/booking-plot", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const body = req.body;

            const plot = await fastify.prisma.plot.findUnique({ where: { id: body.id } });
            if (!plot) return res.code(404).send({ success: false, message: "Plot not found" });

            const totalCost = parseFloat(plot.totalCost || body.totalCost) || 0;
            const newPaidAmount = parseFloat(body.paidAmount) || 0;
            const remainingAmount = totalCost - newPaidAmount;

            await fastify.prisma.plot.update({
                where: { id: body.id },
                data: {
                    customerName: body.customerName,
                    customerContact: body.customerContact,
                    customerAddress: body.customerAddress,
                    totalCost: totalCost.toString(),
                    paidAmount: newPaidAmount.toString(),
                    remainingAmount: remainingAmount.toString(),
                    status: "BOOKED",
                    paymentImage: body.paymentImage || null,
                    paymentMode: body.paymentMode || null,
                    aadhar: body.aadhar || null,
                    referId: body.referId || null,
                    teamHeadId: body.teamHeadId || null,
                    associateId: body.associateId || null,
                    associateUserAuthId: body.associateUserAuthId || null,
                    plotBookingPlan: body.plotBookingPlan || null,
                    paymentType: body.paymentType || null,
                    pbNumber: body.pbNumber || null,
                    bookingDate: new Date(),
                    registeredDate: null,
                },
            });

            return { success: true, message: "Successfully booked plot", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error booking plot" });
        }
    });

    // ===================== POST /api/register-plot  (register a plot) =====================
    fastify.post("/register-plot", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const body = req.body;

            const plot = await fastify.prisma.plot.findUnique({ where: { id: body.id } });
            if (!plot) return res.code(404).send({ success: false, message: "Plot not found" });

            await fastify.prisma.plot.update({
                where: { id: body.id },
                data: {
                    status: "REGISTERED",
                    registeredDate: new Date(),
                    customerName: body.customerName || plot.customerName,
                    customerContact: body.customerContact || plot.customerContact,
                    customerAddress: body.customerAddress || plot.customerAddress,
                    totalCost: body.totalCost || plot.totalCost,
                    paidAmount: body.paidAmount || plot.paidAmount,
                    remainingAmount: body.remainingAmount || plot.remainingAmount,
                },
            });

            return { success: true, message: "Plot registered successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error registering plot" });
        }
    });

    // ===================== POST /api/update-plot-booking  (update booking plan) =====================
    fastify.post("/update-plot-booking", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const body = req.body;

            const plot = await fastify.prisma.plot.findUnique({ where: { id: body.id } });
            if (!plot) return res.code(404).send({ success: false, message: "Plot not found" });

            const oldDays = parseInt(plot.plotBookingPlan, 10) || 0;
            const newDays = parseInt(body.plotBookingPlan, 10) || 0;

            if (newDays <= oldDays) {
                return res.code(400).send({
                    success: false,
                    message: "New booking plan must be greater than the existing plan",
                });
            }

            await fastify.prisma.plot.update({
                where: { id: body.id },
                data: {
                    plotBookingPlan: newDays.toString(),
                    paymentType: body.paymentType || plot.paymentType,
                },
            });

            return { success: true, message: "Booking plan updated successfully", status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error updating booking plan" });
        }
    });

    // ===================== POST /api/plots-bulk  (bulk create) =====================
    fastify.post("/plots-bulk", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { companyId } = req.user;
            const { plots } = req.body;

            if (!plots || !Array.isArray(plots) || plots.length === 0) {
                return res.code(400).send({ success: false, message: "No plots data provided" });
            }

            const data = plots.map((p) => ({
                facing: p.facing || null,
                sqrYards: parseFloat(p.sqrYards) || 0,
                phaseId: p.phaseId || null,
                plotCategory: p.plotCategory || "residential",
                plotNumber: p.plotNumber,
                projectId: p.projectId,
                projectName: p.projectName,
                companyId,
                status: "AVAILABLE",
            }));

            const result = await fastify.prisma.plot.createMany({ data, skipDuplicates: true });

            return {
                success: true,
                message: `${result.count} plots created successfully`,
                status: 200,
            };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error creating bulk plots" });
        }
    });

    // ===================== GET /api/phases/:projectId =====================
    fastify.get("/phases/:projectId", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const phases = await fastify.prisma.phase.findMany({
                where: { projectId: req.params.projectId },
                orderBy: { phaseName: "asc" },
            });
            return { success: true, phase: phases, status: 200 };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching phases" });
        }
    });
}
