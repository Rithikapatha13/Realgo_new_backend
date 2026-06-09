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

            // If resetting to AVAILABLE or fully registered, delete existing reminders
            if (body.status === "AVAILABLE" || body.status === "REGISTERED") {
                try {
                    await fastify.prisma.autoReminder.deleteMany({
                        where: { plotId: body.id }
                    });
                } catch (err) {
                    fastify.log.error("Failed to delete auto-reminders on status change: " + err.message);
                }
            }

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

            const plot = await fastify.prisma.plot.findUnique({ 
                where: { id: body.id },
                include: { phase: true }
            });
            if (!plot) return res.code(404).send({ success: false, message: "Plot not found" });

            const totalCost = parseFloat(plot.totalCost || body.totalCost) || 0;
            const newPaidAmount = parseFloat(body.paidAmount) || 0;
            const remainingAmount = totalCost - newPaidAmount;

            let resolvedAssociateId = null;
            let resolvedAssociateUserAuthId = null;
            let resolvedReferId = body.referId || null;
            let resolvedTeamHeadId = body.teamHeadId || null;

            if (body.associateId && body.associateId.trim() !== "") {
                const assocInput = body.associateId.trim();
                const associateUser = await fastify.prisma.user.findFirst({
                    where: {
                        OR: [
                            { id: assocInput },
                            { userAuthId: assocInput },
                            { username: assocInput },
                            { phone: assocInput }
                        ],
                        companyId: plot.companyId
                    }
                });

                if (associateUser) {
                    resolvedAssociateId = associateUser.id;
                    resolvedAssociateUserAuthId = associateUser.userAuthId || assocInput;
                    resolvedReferId = resolvedReferId || associateUser.referId || null;
                    resolvedTeamHeadId = resolvedTeamHeadId || associateUser.teamHeadId || null;
                } else {
                    return res.code(400).send({
                        success: false,
                        message: `Associate with ID/Code '${assocInput}' not found.`
                    });
                }
            }

            const totalBookingDays = parseInt(body.plotBookingPlan, 10) || 0;
            const isFullyPaid = body.plotBookingPlan === "0" || remainingAmount <= 0 || body.paymentType === "FULL";

            if (!isFullyPaid && totalBookingDays > 0 && !resolvedAssociateId) {
                return res.code(400).send({
                    success: false,
                    message: "A valid Associate ID/Code is required when scheduling a booking plan."
                });
            }

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
                    referId: resolvedReferId,
                    teamHeadId: resolvedTeamHeadId,
                    associateId: resolvedAssociateId,
                    associateUserAuthId: resolvedAssociateUserAuthId,
                    plotBookingPlan: body.plotBookingPlan || null,
                    paymentType: body.paymentType || null,
                    pbNumber: body.pbNumber || null,
                    bookingDate: new Date(),
                    registeredDate: null,
                },
            });

            // Create notification for ClientAdmin
            try {
                const company = await fastify.prisma.company.findUnique({
                    where: { id: plot.companyId },
                    select: { company: true }
                });
                const companyName = company ? company.company : "Realgo";

                await fastify.prisma.notification.create({
                    data: {
                        title: "Plot Booked",
                        body: `Plot ${plot.plotNumber} in project ${plot.projectName} has been booked by ${body.customerName || "Customer"}.`,
                        notificationType: "PLOT_BOOKED",
                        companyId: plot.companyId,
                        companyName,
                        status: "UNREAD",
                        isRead: false
                    }
                });
            } catch (err) {
                fastify.log.error("Failed to create booking notification: " + err.message);
            }

            // ==================== AUTO REMINDERS SCHEDULER ====================
            try {
                // Delete existing reminders for this plot
                await fastify.prisma.autoReminder.deleteMany({
                    where: { plotId: body.id }
                });

                if (!isFullyPaid && totalBookingDays > 0 && resolvedAssociateId) {
                    const bookingDate = new Date();
                    let reminderMessages = {};

                    if (totalBookingDays === 15) {
                        // 15-day plan reminders
                        reminderMessages = {
                            [Math.floor(totalBookingDays * 0.25)]: { type: "first_reminder", message: `Reminder: ${Math.floor(totalBookingDays * 0.25)} days left before Agreement Day for Plot ${plot.plotNumber} in ${plot.projectName}.` },
                            [Math.floor(totalBookingDays * 0.50)]: { type: "agreement_day", message: `Today is Agreement Day for Plot ${plot.plotNumber} in ${plot.projectName}. Please complete the necessary formalities.` },
                            [Math.floor(totalBookingDays * 0.75)]: { type: "third_reminder", message: `Reminder: ${totalBookingDays - Math.floor(totalBookingDays * 0.75)} days left for Registration Day for Plot ${plot.plotNumber} in ${plot.projectName}. Ensure all payments are in order.` },
                            [totalBookingDays]: { type: "registration_day", message: `Today is Registration Day for Plot ${plot.plotNumber} in ${plot.projectName}. Please proceed with the final registration process.` },
                        };
                    } else {
                        // For plans >= 45 days, use 4 reminders
                        const agreementDay = Math.floor(totalBookingDays * 0.50);  // 50% of booking days
                        const firstReminder = agreementDay - 10;  // 10 days before agreement
                        const thirdReminder = totalBookingDays - 10;  // 10 days before registration
                        const registrationDay = totalBookingDays;  // Final registration day

                        reminderMessages = {
                            [firstReminder]: { type: "first_reminder", message: `Reminder: 10 days left before Agreement Day for Plot ${plot.plotNumber} in ${plot.projectName}.` },
                            [agreementDay]: { type: "agreement_day", message: `Today is Agreement Day for Plot ${plot.plotNumber} in ${plot.projectName}. Please complete the necessary formalities.` },
                            [thirdReminder]: { type: "third_reminder", message: `Reminder: 10 days left before Registration Day for Plot ${plot.plotNumber} in ${plot.projectName}. Ensure all payments are in order.` },
                            [registrationDay]: { type: "registration_day", message: `Today is Registration Day for Plot ${plot.plotNumber} in ${plot.projectName}. Please proceed with the final registration process.` },
                        };
                    }

                    const reminderIntervals = Object.keys(reminderMessages).map(Number);

                    for (const days of reminderIntervals) {
                        const reminderDate = new Date(bookingDate);
                        reminderDate.setDate(reminderDate.getDate() + days);

                        await fastify.prisma.autoReminder.create({
                            data: {
                                plotId: plot.id,
                                plotNumber: plot.plotNumber,
                                projectName: plot.projectName,
                                phaseName: plot.phase?.phaseName || null,
                                associateId: resolvedAssociateId,
                                type: reminderMessages[days].type,
                                reminderDate: reminderDate,
                                description: reminderMessages[days].message,
                                companyId: plot.companyId,
                            }
                        });

                        // Create reminders for key users on Agreement and Registration days
                        if (reminderMessages[days].type === "agreement_day" || reminderMessages[days].type === "registration_day") {
                            const keyUsers = [...new Set([resolvedReferId, resolvedTeamHeadId].filter(Boolean))];

                            for (const userId of keyUsers) {
                                if (userId) {
                                    const userType = userId === resolvedTeamHeadId ? "teamhead" : "upliner";
                                    const customMessage = userType === "teamhead"
                                        ? `Reminder for Team Head: ${reminderMessages[days].message}`
                                        : `Reminder for Upliner: ${reminderMessages[days].message}`;

                                    await fastify.prisma.autoReminder.create({
                                        data: {
                                            plotId: plot.id,
                                            plotNumber: plot.plotNumber,
                                            projectName: plot.projectName,
                                            phaseName: plot.phase?.phaseName || null,
                                            associateId: userId,
                                            type: reminderMessages[days].type,
                                            reminderDate: reminderDate,
                                            description: customMessage,
                                            companyId: plot.companyId,
                                        }
                                    });
                                }
                            }
                        }
                    }

                    // Add admin check reminder (1 day after final registration day)
                    const adminReminderDate = new Date(bookingDate);
                    adminReminderDate.setDate(adminReminderDate.getDate() + totalBookingDays + 1);

                    await fastify.prisma.autoReminder.create({
                        data: {
                            plotId: plot.id,
                            plotNumber: plot.plotNumber,
                            projectName: plot.projectName,
                            phaseName: plot.phase?.phaseName || null,
                            associateId: resolvedAssociateId, // We link to the associate raising it
                            type: "admin_check",
                            reminderDate: adminReminderDate,
                            description: `Admin Reminder: Please review and update the status of Plot ${plot.plotNumber} in ${plot.projectName}.`,
                            companyId: plot.companyId,
                        }
                    });
                }
            } catch (err) {
                fastify.log.error("Failed to generate auto-reminders: " + err.message);
            }

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

            // Delete existing reminders for this plot since it's fully registered
            try {
                await fastify.prisma.autoReminder.deleteMany({
                    where: { plotId: body.id }
                });
            } catch (err) {
                fastify.log.error("Failed to delete auto-reminders upon registration: " + err.message);
            }

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

            const updatedPlot = await fastify.prisma.plot.update({
                where: { id: body.id },
                include: { phase: true },
                data: {
                    plotBookingPlan: newDays.toString(),
                    paymentType: body.paymentType || plot.paymentType,
                },
            });

            // ==================== AUTO REMINDERS RECREATION ====================
            try {
                // Delete existing reminders for this plot
                await fastify.prisma.autoReminder.deleteMany({
                    where: { plotId: body.id }
                });

                const totalBookingDays = newDays;
                const isFullyPaid = updatedPlot.paymentType === "FULL" || parseFloat(updatedPlot.remainingAmount) <= 0;

                if (!isFullyPaid && totalBookingDays > 0) {
                    const bookingDate = updatedPlot.bookingDate || new Date();
                    let reminderMessages = {};

                    if (totalBookingDays === 15) {
                        reminderMessages = {
                            [Math.floor(totalBookingDays * 0.25)]: { type: "first_reminder", message: `Reminder: ${Math.floor(totalBookingDays * 0.25)} days left before Agreement Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}.` },
                            [Math.floor(totalBookingDays * 0.50)]: { type: "agreement_day", message: `Today is Agreement Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}. Please complete the necessary formalities.` },
                            [Math.floor(totalBookingDays * 0.75)]: { type: "third_reminder", message: `Reminder: ${totalBookingDays - Math.floor(totalBookingDays * 0.75)} days left for Registration Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}. Ensure all payments are in order.` },
                            [totalBookingDays]: { type: "registration_day", message: `Today is Registration Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}. Please proceed with the final registration process.` },
                        };
                    } else {
                        const agreementDay = Math.floor(totalBookingDays * 0.50);
                        const firstReminder = agreementDay - 10;
                        const thirdReminder = totalBookingDays - 10;
                        const registrationDay = totalBookingDays;

                        reminderMessages = {
                            [firstReminder]: { type: "first_reminder", message: `Reminder: 10 days left before Agreement Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}.` },
                            [agreementDay]: { type: "agreement_day", message: `Today is Agreement Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}. Please complete the necessary formalities.` },
                            [thirdReminder]: { type: "third_reminder", message: `Reminder: 10 days left before Registration Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}. Ensure all payments are in order.` },
                            [registrationDay]: { type: "registration_day", message: `Today is Registration Day for Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}. Please proceed with the final registration process.` },
                        };
                    }

                    const reminderIntervals = Object.keys(reminderMessages).map(Number);

                    for (const days of reminderIntervals) {
                        const reminderDate = new Date(bookingDate);
                        reminderDate.setDate(reminderDate.getDate() + days);

                        await fastify.prisma.autoReminder.create({
                            data: {
                                plotId: updatedPlot.id,
                                plotNumber: updatedPlot.plotNumber,
                                projectName: updatedPlot.projectName,
                                phaseName: updatedPlot.phase?.phaseName || null,
                                associateId: updatedPlot.associateId || body.associateId,
                                type: reminderMessages[days].type,
                                reminderDate: reminderDate,
                                description: reminderMessages[days].message,
                                companyId: updatedPlot.companyId,
                            }
                        });

                        if (reminderMessages[days].type === "agreement_day" || reminderMessages[days].type === "registration_day") {
                            const keyUsers = [...new Set([updatedPlot.referId, updatedPlot.teamHeadId].filter(Boolean))];

                            for (const userId of keyUsers) {
                                if (userId) {
                                    const userType = userId === updatedPlot.teamHeadId ? "teamhead" : "upliner";
                                    const customMessage = userType === "teamhead"
                                        ? `Reminder for Team Head: ${reminderMessages[days].message}`
                                        : `Reminder for Upliner: ${reminderMessages[days].message}`;

                                    await fastify.prisma.autoReminder.create({
                                        data: {
                                            plotId: updatedPlot.id,
                                            plotNumber: updatedPlot.plotNumber,
                                            projectName: updatedPlot.projectName,
                                            phaseName: updatedPlot.phase?.phaseName || null,
                                            associateId: userId,
                                            type: reminderMessages[days].type,
                                            reminderDate: reminderDate,
                                            description: customMessage,
                                            companyId: updatedPlot.companyId,
                                        }
                                    });
                                }
                            }
                        }
                    }

                    const adminReminderDate = new Date(bookingDate);
                    adminReminderDate.setDate(adminReminderDate.getDate() + totalBookingDays + 1);

                    await fastify.prisma.autoReminder.create({
                        data: {
                            plotId: updatedPlot.id,
                            plotNumber: updatedPlot.plotNumber,
                            projectName: updatedPlot.projectName,
                            phaseName: updatedPlot.phase?.phaseName || null,
                            associateId: updatedPlot.associateId || body.associateId,
                            type: "admin_check",
                            reminderDate: adminReminderDate,
                            description: `Admin Reminder: Please review and update the status of Plot ${updatedPlot.plotNumber} in ${updatedPlot.projectName}.`,
                            companyId: updatedPlot.companyId,
                        }
                    });
                }
            } catch (err) {
                fastify.log.error("Failed to update auto-reminders: " + err.message);
            }

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


    // ===================== GET /api/plots-map-data/:projectId =====================
    fastify.get("/plots-map-data/:projectId", { preHandler: authMiddleware }, async (req, res) => {
        try {
            const { projectId } = req.params;
            const { companyId } = req.user;

            const [items, counts, project] = await Promise.all([
                fastify.prisma.plot.findMany({
                    where: { projectId, companyId },
                    select: {
                        id: true,
                        plotNumber: true,
                        status: true,
                        facing: true,
                        sqrYards: true,
                        customerName: true,
                    },
                }),
                fastify.prisma.plot.groupBy({
                    by: ["status"],
                    where: { projectId, companyId },
                    _count: true,
                }),
                fastify.prisma.project.findUnique({
                    where: { id: projectId },
                    select: { projectName: true }
                })
            ]);

            const stats = {
                availableCount: 0,
                bookedCount: 0,
                registeredCount: 0,
                holdCount: 0,
            };

            counts.forEach((c) => {
                if (c.status === "AVAILABLE") stats.availableCount = c._count;
                if (c.status === "BOOKED") stats.bookedCount = c._count;
                if (c.status === "REGISTERED") stats.registeredCount = c._count;
                if (c.status === "HOLD") stats.holdCount = c._count;
            });

            return {
                success: true,
                data: {
                    items,
                    projectName: project?.projectName || "",
                    ...stats,
                },
                status: 200,
            };
        } catch (error) {
            fastify.log.error(error);
            return res.code(500).send({ success: false, message: "Error fetching plots map data" });
        }
    });
}
