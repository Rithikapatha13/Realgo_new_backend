import authMiddleware from "../middlewares/auth.middleware.js";

export default async function reminderRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // Create Reminder
    fastify.post("/reminders", async (req, reply) => {
        try {
            const { type, description, date, time, repeat, selectedDays } = req.body;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            if (repeat === 'Weekly' && (!selectedDays || selectedDays.length === 0)) {
                return reply.code(400).send({
                    success: false,
                    message: "Selected days are required for weekly reminders."
                });
            }

            const newReminder = await prisma.reminder.create({
                data: {
                    type,
                    description,
                    date,
                    time,
                    repeat,
                    selectedDays: selectedDays || [],
                    userId,
                    companyId,
                }
            });

            return reply.code(201).send({ success: true, message: "Reminder created successfully", reminder: newReminder });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get Reminders (Paginated)
    fastify.get("/reminders", async (req, reply) => {
        try {
            const { page = 1, size = 10, name, type } = req.query;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const pageIndex = parseInt(page);
            const pageSize = parseInt(size);

            const where = {
                companyId,
                userId,
            };

            if (name) {
                where.description = { contains: name, mode: "insensitive" };
            }

            if (type && type !== "all") {
                where.type = { has: type };
            }

            const [reminders, total] = await Promise.all([
                prisma.reminder.findMany({
                    where,
                    orderBy: { date: "desc" },
                    skip: (pageIndex - 1) * pageSize,
                    take: pageSize,
                }),
                prisma.reminder.count({ where }),
            ]);

            return reply.send({
                success: true,
                items: reminders,
                total,
                pageNumber: pageIndex,
                pageLimit: pageSize,
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get Today's Reminders
    fastify.get("/reminders/today", async (req, reply) => {
        try {
            const companyId = req.user.companyId;
            const userId = req.user.id;

            // Date logic from realgo old
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);

            const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

            const todayFormatted = today.toISOString().split('T')[0] + ' 00:00:00+05:30';
            const tomorrowFormatted = tomorrow.toISOString().split('T')[0] + ' 00:00:00+05:30';

            const todayDay = today.toLocaleDateString('en-US', { weekday: 'long' }).toLocaleLowerCase();
            const todayDayCapitalized = todayDay.charAt(0).toUpperCase() + todayDay.slice(1);

            // In Prisma, date is stored as String. 
            // We can fetch all reminders and filter in memory, or try to construct a suitable query.
            // Since repeat logic is complex, we fetch those matching the criteria
            
            const reminders = await prisma.reminder.findMany({
                where: {
                    userId,
                    companyId,
                    OR: [
                        {
                            date: {
                                gte: todayFormatted,
                                lt: tomorrowFormatted,
                            }
                        },
                        {
                            repeat: 'Everyday'
                        },
                        {
                            selectedDays: {
                                has: todayDayCapitalized
                            }
                        }
                    ]
                }
            });

            return reply.send({
                success: true,
                reminders,
                total: reminders.length,
            });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get Reminder by ID
    fastify.get("/reminders/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const reminder = await prisma.reminder.findUnique({
                where: { id }
            });

            if (!reminder || reminder.companyId !== companyId || reminder.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Reminder not found" });
            }

            return reply.send({ success: true, reminder });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Update Reminder
    fastify.put("/reminders", async (req, reply) => {
        try {
            const { id, type, description, date, time, repeat, selectedDays } = req.body;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const existingReminder = await prisma.reminder.findUnique({ where: { id } });

            if (!existingReminder || existingReminder.companyId !== companyId || existingReminder.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Reminder not found" });
            }

            const updatedReminder = await prisma.reminder.update({
                where: { id },
                data: {
                    type,
                    description,
                    date,
                    time,
                    repeat,
                    selectedDays: selectedDays || []
                }
            });

            return reply.send({ success: true, message: "Reminder updated successfully", reminder: updatedReminder });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Update Reminder Time
    fastify.put("/reminders/time", async (req, reply) => {
        try {
            const { id, date, time } = req.body;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const existingReminder = await prisma.reminder.findUnique({ where: { id } });

            if (!existingReminder || existingReminder.companyId !== companyId || existingReminder.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Reminder not found" });
            }

            const updatedReminder = await prisma.reminder.update({
                where: { id },
                data: { date, time }
            });

            return reply.send({ success: true, message: "Reminder time updated successfully", reminder: updatedReminder });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Delete Reminder
    fastify.delete("/reminders/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const existingReminder = await prisma.reminder.findUnique({ where: { id } });

            if (!existingReminder || existingReminder.companyId !== companyId || existingReminder.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Reminder not found" });
            }

            await prisma.reminder.delete({ where: { id } });

            return reply.send({ success: true, message: "Reminder deleted successfully" });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });
}
