import authMiddleware from "../middlewares/auth.middleware.js";

export default async function requestRoutes(fastify) {
  fastify.addHook("preHandler", authMiddleware);

  // GET /api/requests
  fastify.get("/requests", async (req, reply) => {
    try {
      const { companyId } = req.user;
      const { status, type } = req.query;

      // ── Filters for the Request table ──
      const requestWhere = {};

      if (status && status !== "") {
        requestWhere.status = status;
      }
      if (type && type !== "" && type !== "All Types") {
        requestWhere.requestType = type;
      }

      // Scope by company: compare requestedBy user's companyId with logged-in admin's companyId
      // (Request table has no direct companyId column)
      if (companyId) {
        requestWhere.requestBy = { companyId };
      }

      // Total rows in Request table (for debug)
      const totalInTable = await fastify.prisma.request.count();

      // Fetch from Request table
      const requestRecords = await fastify.prisma.request.findMany({
        where: requestWhere,
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              phone: true,
              image: true,
              companyId: true,
              role: { select: { displayName: true, roleName: true } }
            }
          },
          requestBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              username: true,
              phone: true,
              image: true
            }
          }
        }
      });

      // Fetch PENDING users (awaiting approval) scoped to this company
      const pendingUserWhere = { status: "PENDING" };
      if (companyId) pendingUserWhere.companyId = companyId;

      const pendingUsers = await fastify.prisma.user.findMany({
        where: pendingUserWhere,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          phone: true,
          image: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          role: { select: { displayName: true, roleName: true } }
        }
      });

      // Skip USER_APPROVAL entries if a specific type filter (other than USER_APPROVAL) is set
      const includePendingUsers = !type || type === "" || type === "All Types" || type === "USER_APPROVAL";

      // Map pending users to unified shape
      const pendingAsRequests = includePendingUsers
        ? pendingUsers.map(u => ({
          id: `user-${u.id}`,
          requestType: "USER_APPROVAL",
          status: "PENDING",
          message: "User awaiting approval",
          requestedName: `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          timestamp: u.createdAt,
          createdAt: u.createdAt,
          user: u,
          requestBy: null,
          _source: "user_table"
        }))
        : [];

      // Skip PENDING users if status filter is APPROVED or REJECTED
      const filteredPendingAsRequests =
        status && status !== "" && status !== "PENDING"
          ? []
          : pendingAsRequests;

      // Merge and sort by date
      const combined = [
        ...requestRecords.map(r => ({ ...r, _source: "request_table" })),
        ...filteredPendingAsRequests
      ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      console.log(
        `[Requests] companyId=${companyId}, totalInTable=${totalInTable}, fromRequestTable=${requestRecords.length}, pendingUsers=${pendingUsers.length}, combined=${combined.length}`
      );

      return reply.send({
        success: true,
        items: combined,
        total: combined.length,
        debug: {
          totalInTable,
          fromRequestTable: requestRecords.length,
          pendingUsers: pendingUsers.length
        }
      });

    } catch (err) {
      req.log.error(err);
      console.error("Error in GET /requests:", err);
      return reply.code(500).send({ success: false, message: err.message || "Internal server error" });
    }
  });

  // POST /api/requests - Create a new request
  fastify.post("/requests", async (req, reply) => {
    try {
      const { userId, requestType, message, requestedName } = req.body;
      const requestedById = req.user.userId;

      if (!userId || !requestType) {
        return reply.code(400).send({ success: false, message: "userId and requestType are required" });
      }

      const newRequest = await fastify.prisma.request.create({
        data: {
          requestType,
          userId,
          requestedById,
          requestedName: requestedName || "",
          message: message || "",
          timestamp: new Date(),
          status: "PENDING"
        }
      });

      // Dispatch notifications to Admins
      try {
        const reqUser = await fastify.prisma.user.findUnique({
          where: { id: requestedById },
          select: { firstName: true, lastName: true, username: true, companyId: true, company: { select: { company: true } } }
        });

        if (reqUser) {
          const companyId = reqUser.companyId;
          const companyName = reqUser.company?.company || "Realgo";
          const senderName = `${reqUser.firstName || ""} ${reqUser.lastName || ""}`.trim() || reqUser.username;

          // Fetch all sub-admins in this company who have ADMIN or CRM module access
          const admins = await fastify.prisma.admin.findMany({
            where: {
              companyId,
              role: {
                modules: {
                  hasSome: ["ADMIN", "CRM"]
                }
              }
            }
          });



          // Create notifications for sub-admins
          for (const admin of admins) {
            await fastify.prisma.notification.create({
              data: {
                adminId: admin.id,
                title: "New Plot Booking Request",
                body: `${senderName} has submitted a new plot booking request for "${requestedName || "Customer"}".`,
                notificationType: "NEW_REQUEST",
                companyId,
                companyName,
                status: "UNREAD",
                isRead: false
              }
            });
          }
        }
      } catch (err) {
        fastify.log.error("Failed to notify admins of request: " + err.message);
      }

      return reply.code(201).send({ success: true, data: newRequest });
    } catch (err) {
      req.log.error(err);
      console.error("Error in POST /requests:", err);
      return reply.code(500).send({ success: false, message: err.message || "Internal server error" });
    }
  });


  // PUT /api/requests/:id/status - Approve or Reject a request
  fastify.put("/requests/:id/status", async (req, reply) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const validStatuses = ["PENDING", "APPROVED", "REJECTED"];
      if (!validStatuses.includes(status)) {
        return reply.code(400).send({ success: false, message: "Invalid status value" });
      }

      // If it's a user-approval type (id starts with 'user-'), update the User status
      if (id.startsWith("user-")) {
        const userId = id.replace("user-", "");
        const newUserStatus = status === "APPROVED" ? "VERIFIED" : "REJECT";
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { status: newUserStatus }
        });
        return reply.send({ success: true, message: `User ${status.toLowerCase()} successfully` });
      }

      // Otherwise update the Request table
      const request = await fastify.prisma.request.findUnique({
        where: { id }
      });

      if (!request) {
        return reply.code(404).send({ success: false, message: "Request not found" });
      }

      const updated = await fastify.prisma.request.update({
        where: { id },
        data: { status }
      });

      // If PLOT_BOOKING is APPROVED, automatically execute plot booking and auto-reminder creation
      if (status === "APPROVED" && request.requestType === "PLOT_BOOKING" && request.message) {
        try {
          const projectMatch = request.message.match(/• Project:\s*(.*)/);
          const plotNumberMatch = request.message.match(/• Plot Number:\s*(.*)/);
          const contactMatch = request.message.match(/• Contact:\s*(.*)/);
          const addressMatch = request.message.match(/• Address:\s*(.*)/);

          if (projectMatch && plotNumberMatch) {
            const projectName = projectMatch[1].replace(/\r$/, '').trim();
            const plotNumber = plotNumberMatch[1].replace(/\r$/, '').trim();

            const reqUser = await fastify.prisma.user.findUnique({
              where: { id: request.userId },
              select: { companyId: true, referId: true, teamHeadId: true, userAuthId: true }
            });

            if (reqUser && reqUser.companyId) {
              const plot = await fastify.prisma.plot.findFirst({
                where: {
                  plotNumber,
                  projectName,
                  companyId: reqUser.companyId
                },
                include: { phase: true }
              });

              if (plot && plot.status === "AVAILABLE") {
                const customerName = request.requestedName || "Customer";
                const customerContact = contactMatch ? contactMatch[1].replace(/\r$/, '').trim() : "";
                const customerAddress = addressMatch ? addressMatch[1].replace(/\r$/, '').trim() : "";

                // Parse booking plan days (15, 45, 90, 120) from notes
                let plotBookingPlan = "15";
                const noteMatch = request.message.match(/Additional Note:\s*([\s\S]*)/i);
                if (noteMatch) {
                  const noteText = noteMatch[1];
                  const daysMatch = noteText.match(/\b(15|45|90|120)\b/);
                  if (daysMatch) {
                    plotBookingPlan = daysMatch[1];
                  }
                }

                const totalCost = parseFloat(plot.totalCost) || 0;
                const remainingAmount = totalCost;

                // Update Plot record
                await fastify.prisma.plot.update({
                  where: { id: plot.id },
                  data: {
                    customerName,
                    customerContact,
                    customerAddress,
                    status: "BOOKED",
                    associateId: request.userId,
                    associateUserAuthId: reqUser.userAuthId || null,
                    referId: reqUser.referId || null,
                    teamHeadId: reqUser.teamHeadId || null,
                    plotBookingPlan,
                    paidAmount: "0",
                    remainingAmount: remainingAmount.toString(),
                    bookingDate: new Date(),
                    registeredDate: null,
                  }
                });

                // Generate AutoReminders
                const totalBookingDays = parseInt(plotBookingPlan, 10) || 0;
                if (totalBookingDays > 0) {
                  const bookingDate = new Date();
                  let reminderMessages = {};

                  if (totalBookingDays === 15) {
                    reminderMessages = {
                      [Math.floor(totalBookingDays * 0.25)]: { type: "first_reminder", message: `Reminder: ${Math.floor(totalBookingDays * 0.25)} days left before Agreement Day for Plot ${plot.plotNumber} in ${plot.projectName}.` },
                      [Math.floor(totalBookingDays * 0.50)]: { type: "agreement_day", message: `Today is Agreement Day for Plot ${plot.plotNumber} in ${plot.projectName}. Please complete the necessary formalities.` },
                      [Math.floor(totalBookingDays * 0.75)]: { type: "third_reminder", message: `Reminder: ${totalBookingDays - Math.floor(totalBookingDays * 0.75)} days left for Registration Day for Plot ${plot.plotNumber} in ${plot.projectName}. Ensure all payments are in order.` },
                      [totalBookingDays]: { type: "registration_day", message: `Today is Registration Day for Plot ${plot.plotNumber} in ${plot.projectName}. Please proceed with the final registration process.` },
                    };
                  } else {
                    const agreementDay = Math.floor(totalBookingDays * 0.50);
                    const firstReminder = agreementDay - 10;
                    const thirdReminder = totalBookingDays - 10;
                    const registrationDay = totalBookingDays;

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
                        associateId: request.userId,
                        type: reminderMessages[days].type,
                        reminderDate,
                        description: reminderMessages[days].message,
                        companyId: plot.companyId,
                      }
                    });

                    // Reminders for Upliner and Team Head
                    if (reminderMessages[days].type === "agreement_day" || reminderMessages[days].type === "registration_day") {
                      const keyUsers = [...new Set([reqUser.referId, reqUser.teamHeadId].filter(Boolean))];
                      for (const uId of keyUsers) {
                        const userType = uId === reqUser.teamHeadId ? "teamhead" : "upliner";
                        const customMessage = userType === "teamhead"
                          ? `Reminder for Team Head: ${reminderMessages[days].message}`
                          : `Reminder for Upliner: ${reminderMessages[days].message}`;

                        await fastify.prisma.autoReminder.create({
                          data: {
                            plotId: plot.id,
                            plotNumber: plot.plotNumber,
                            projectName: plot.projectName,
                            phaseName: plot.phase?.phaseName || null,
                            associateId: uId,
                            type: reminderMessages[days].type,
                            reminderDate,
                            description: customMessage,
                            companyId: plot.companyId,
                          }
                        });
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
                      associateId: request.userId,
                      type: "admin_check",
                      reminderDate: adminReminderDate,
                      description: `Admin Reminder: Please review and update the status of Plot ${plot.plotNumber} in ${plot.projectName}.`,
                      companyId: plot.companyId,
                    }
                  });
                }
              }
            }
          }
        } catch (err) {
          fastify.log.error("Automatic booking on request approval failed: " + err.message);
        }
      }

      // Send notification to requesting associate
      try {
        const reqUser = await fastify.prisma.user.findUnique({
          where: { id: request.requestedById },
          select: { companyId: true, company: { select: { company: true } } }
        });
        
        if (reqUser) {
          await fastify.prisma.notification.create({
            data: {
              userId: request.requestedById,
              title: `Request ${status === "APPROVED" ? "Approved" : "Rejected"}`,
              body: `Your ${request.requestType.replace("_", " ")} request for "${request.requestedName || "Plot"}" has been ${status.toLowerCase()}.`,
              notificationType: "REQUEST_STATUS",
              companyId: reqUser.companyId,
              companyName: reqUser.company?.company || "Realgo",
              status: "UNREAD",
              isRead: false
            }
          });
        }
      } catch (err) {
        fastify.log.error("Failed to create request status notification: " + err.message);
      }

      return reply.send({
        success: true,
        message: `Request ${status.toLowerCase()} successfully`,
        data: updated
      });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: err.message || "Internal server error" });
    }
  });

  // DELETE /api/requests/:id
  fastify.delete("/requests/:id", async (req, reply) => {
    try {
      const { id } = req.params;

      // If it's a pending user request
      if (id.startsWith("user-")) {
        const userId = id.replace("user-", "");
        await fastify.prisma.user.update({
          where: { id: userId },
          data: { status: "REJECT" }
        });
        return reply.send({ success: true, message: "User request rejected and dismissed" });
      }

      await fastify.prisma.request.delete({ where: { id } });
      return reply.send({ success: true, message: "Request deleted successfully" });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: err.message || "Internal server error" });
    }
  });
}
