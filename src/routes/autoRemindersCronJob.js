import cron from "node-cron";

export default async function autoRemindersCronJob(fastify, options) {
    // Cron schedule: runs daily at 9:30 AM IST (Asia/Kolkata timezone)
    cron.schedule(
        "30 9 * * *",
        async () => {
            try {
                fastify.log.info("Running daily AutoReminders check...");
                const now = new Date();
                const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
                const todayIST = new Date(now.getTime() + istOffset);

                // Format: YYYY-MM-DD
                const todayDateString = todayIST.toISOString().slice(0, 10);

                const reminders = await fastify.prisma.autoReminder.findMany({
                    where: {
                        status: "PENDING"
                    }
                });

                const filteredReminders = reminders.filter((reminder) => {
                    const rDate = new Date(reminder.reminderDate);
                    const rDateString = rDate.toISOString().slice(0, 10);
                    return todayDateString === rDateString;
                });

                fastify.log.info(`Found ${filteredReminders.length} reminders to process for today (${todayDateString})`);

                for (const reminder of filteredReminders) {
                    const company = await fastify.prisma.company.findUnique({
                        where: { id: reminder.companyId },
                        select: { company: true }
                    });
                    const companyName = company ? company.company : "Realgo";

                    if (reminder.type === "admin_check") {
                        // 1. Fetch all admins from Admin table
                        const admins = await fastify.prisma.admin.findMany({
                            where: { companyId: reminder.companyId }
                        });

                        // 2. Fetch all user-admins from User table
                        const users = await fastify.prisma.user.findMany({
                            where: { 
                                companyId: reminder.companyId,
                                role: {
                                    roleName: {
                                        in: ["admin", "Admin", "clientadmin", "client-admin", "companyadmin", "COMPANY_ADMIN", "superadmin"]
                                    }
                                }
                            }
                        });

                        // Create notifications for Admin staff
                        for (const admin of admins) {
                            await fastify.prisma.notification.create({
                                data: {
                                    adminId: admin.id,
                                    title: "Admin Plot Status Check Needed",
                                    body: reminder.description,
                                    notificationType: "PLOT_REMINDER",
                                    companyId: reminder.companyId,
                                    companyName,
                                    status: "UNREAD",
                                    isRead: false
                                }
                            });
                        }

                        // Create notifications for User-level admins
                        for (const user of users) {
                            await fastify.prisma.notification.create({
                                data: {
                                    userId: user.id,
                                    title: "Admin Plot Status Check Needed",
                                    body: reminder.description,
                                    notificationType: "PLOT_REMINDER",
                                    companyId: reminder.companyId,
                                    companyName,
                                    status: "UNREAD",
                                    isRead: false
                                }
                            });
                        }
                    } else {
                        // Regular user/associate reminder
                        const isUser = await fastify.prisma.user.findUnique({ where: { id: reminder.associateId } });
                        const isAdmin = !isUser ? await fastify.prisma.admin.findUnique({ where: { id: reminder.associateId } }) : null;
                        const isTC = !isUser && !isAdmin ? await fastify.prisma.telecaller.findUnique({ where: { id: reminder.associateId } }) : null;

                        await fastify.prisma.notification.create({
                            data: {
                                userId: isUser ? reminder.associateId : null,
                                adminId: isAdmin ? reminder.associateId : null,
                                telecallerId: isTC ? reminder.associateId : null,
                                title: "Plot Payment / Booking Milestone Reminder",
                                body: reminder.description,
                                notificationType: "PLOT_REMINDER",
                                companyId: reminder.companyId,
                                companyName,
                                status: "UNREAD",
                                isRead: false
                            }
                        });
                    }

                    // Mark reminder as sent
                    await fastify.prisma.autoReminder.update({
                        where: { id: reminder.id },
                        data: { status: "SENT" }
                    });
                }
            } catch (err) {
                fastify.log.error("Failed executing daily AutoReminders cron job: " + err.message);
            }
        },
        {
            scheduled: true,
            timezone: "Asia/Kolkata"
        }
    );
    fastify.log.info("AutoReminders daily cron registered at 09:30 AM Asia/Kolkata timezone.");
}
