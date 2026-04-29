import authMiddleware from "../middlewares/auth.middleware.js";

export const associateFinanceRoutes = async (fastify, options) => {
    fastify.addHook("preHandler", authMiddleware);

    const prisma = fastify.prisma;

    // --- Associate Contribution ---
    fastify.get("/contributions", async (request, reply) => {
        try {
            const { companyId } = request.user;
            const { 
                page = 1, 
                limit = 10, 
                empId, 
                projectId, 
                status, 
                plotNumber,
                startDate,
                endDate
            } = request.query;

            const skip = (page - 1) * limit;
            const where = {
                companyId,
                ...(empId && { empId }),
                ...(projectId && { projectId }),
                ...(status && { status }),
                ...(plotNumber && { plotNumber: { contains: plotNumber, mode: 'insensitive' } }),
                ...(startDate && endDate && {
                    createdAt: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                })
            };

            const [items, total] = await Promise.all([
                prisma.associateContribution.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.associateContribution.count({ where })
            ]);

            return {
                success: true,
                items,
                total,
                page: parseInt(page),
                limit: parseInt(limit)
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });

    fastify.post("/contributions", async (request, reply) => {
        try {
            const { companyId, id: userId, username } = request.user;
            const data = { ...request.body, companyId };
            const contribution = await prisma.associateContribution.create({ data });

            // Log the creation
            await prisma.financeLog.create({
                data: {
                    action: "CREATE",
                    module: "ASSOCIATE_CONTRIBUTION",
                    recordId: contribution.id,
                    userId,
                    username,
                    companyId,
                    description: `Created contribution of ₹${contribution.totalAmount} for ${contribution.empName} (Plot ${contribution.plotNumber})`,
                    details: contribution
                }
            });

            return { success: true, item: contribution };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });

    fastify.put("/contributions/:id", async (request, reply) => {
        try {
            const { id } = request.params;
            const { companyId, id: userId, username } = request.user;
            
            const old = await prisma.associateContribution.findUnique({ where: { id } });
            const contribution = await prisma.associateContribution.update({
                where: { id },
                data: request.body
            });

            // Log the update
            await prisma.financeLog.create({
                data: {
                    action: "UPDATE",
                    module: "ASSOCIATE_CONTRIBUTION",
                    recordId: id,
                    userId,
                    username,
                    companyId,
                    description: `Updated contribution for ${contribution.empName}`,
                    details: { before: old, after: contribution }
                }
            });

            return { success: true, item: contribution };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });

    // --- Associate Expense ---
    fastify.get("/expenses", async (request, reply) => {
        try {
            const { companyId } = request.user;
            const { page = 1, limit = 10, associateId } = request.query;
            const skip = (page - 1) * limit;

            const where = {
                companyId,
                ...(associateId && { associateId })
            };

            const [items, total] = await Promise.all([
                prisma.associateExpense.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { date: 'desc' }
                }),
                prisma.associateExpense.count({ where })
            ]);

            return { success: true, items, total };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });

    fastify.post("/expenses", async (request, reply) => {
        try {
            const { companyId, id: userId, username } = request.user;
            const data = { ...request.body, companyId, date: new Date(request.body.date) };
            const expense = await prisma.associateExpense.create({ data });

            // Log
            await prisma.financeLog.create({
                data: {
                    action: "CREATE",
                    module: "ASSOCIATE_EXPENSE",
                    recordId: expense.id,
                    userId,
                    username,
                    companyId,
                    description: `Logged expense of ₹${expense.amountSpent} for ${expense.associateName} (${expense.expenseType})`,
                    details: expense
                }
            });

            return { success: true, item: expense };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });

    // --- Associate Payout ---
    fastify.get("/payouts", async (request, reply) => {
        try {
            const { companyId } = request.user;
            const { page = 1, limit = 10, associateId } = request.query;
            const skip = (page - 1) * limit;

            const where = {
                companyId,
                ...(associateId && { associateId })
            };

            const [items, total] = await Promise.all([
                prisma.associatePayout.findMany({
                    where,
                    skip: parseInt(skip),
                    take: parseInt(limit),
                    orderBy: { payoutDate: 'desc' },
                    include: { contribution: true }
                }),
                prisma.associatePayout.count({ where })
            ]);

            return { success: true, items, total };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });

    fastify.post("/payouts", async (request, reply) => {
        try {
            const { companyId, id: userId, username } = request.user;
            const data = { ...request.body, companyId, payoutDate: new Date(request.body.payoutDate) };
            
            if (data.contributionId) {
                await prisma.associateContribution.update({
                    where: { id: data.contributionId },
                    data: { status: 'PAID', payoutDate: data.payoutDate }
                });
            }

            const payout = await prisma.associatePayout.create({ data });

            // Log
            await prisma.financeLog.create({
                data: {
                    action: "CREATE",
                    module: "ASSOCIATE_PAYOUT",
                    recordId: payout.id,
                    userId,
                    username,
                    companyId,
                    description: `Recorded payout of ₹${payout.amountPaid} for Associate ID ${payout.associateId}`,
                    details: payout
                }
            });

            return { success: true, item: payout };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ success: false, message: "Server error" });
        }
    });
};
