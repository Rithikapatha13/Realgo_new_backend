import authMiddleware from "../middlewares/auth.middleware.js";

export default async function followupRoutes(fastify) {
  const { prisma } = fastify;

  fastify.addHook("preHandler", authMiddleware);

  // GET /api/followups - Paginated list of follow-ups
  fastify.get("/followups", async (req, reply) => {
    try {
      const { companyId, userId } = req.user;
      const { page = 1, size = 10, name, status, followup_type, priority } = req.query;

      const pageIndex = parseInt(page);
      const pageSize = parseInt(size);

      // Scoped to current company and user
      const where = {
        companyId,
        userId,
      };

      // Filters
      if (name && name.trim() !== "") {
        where.leadName = { contains: name, mode: "insensitive" };
      }

      if (status && status !== "" && status !== "all") {
        const s = status.toUpperCase();
        if (s === "OPEN") where.followUpStatus = "OPEN";
        else if (s === "PENDING" || s === "IN_PROGRESS") where.followUpStatus = "IN_PROGRESS";
        else if (s === "COMPLETED" || s === "CLOSED") where.followUpStatus = "CLOSED";
      }

      if (followup_type && followup_type !== "" && followup_type !== "all") {
        where.followUpType = followup_type;
      }

      if (priority && priority !== "" && priority !== "all") {
        const p = priority.toUpperCase();
        if (["LOW", "MEDIUM", "HIGH"].includes(p)) {
          where.priority = p;
        }
      }

      const [items, total] = await Promise.all([
        prisma.followUp.findMany({
          where,
          orderBy: { date: "desc" },
          skip: (pageIndex - 1) * pageSize,
          take: pageSize,
          include: {
            project: {
              select: {
                id: true,
                projectName: true
              }
            }
          }
        }),
        prisma.followUp.count({ where }),
      ]);

      // Map back to front-end expected names
      const mappedItems = items.map((item) => {
        let displayStatus = "OPEN";
        if (item.followUpStatus === "IN_PROGRESS") displayStatus = "PENDING";
        else if (item.followUpStatus === "CLOSED") displayStatus = "COMPLETED";

        return {
          id: item.id,
          lead_name: item.leadName,
          phone: item.leadPhone,
          email: item.leadEmail,
          date: item.date,
          time: item.time,
          followup_type: item.followUpType,
          project: item.project?.projectName || "",
          projectId: item.projectId,
          followup_status: displayStatus,
          priority: item.priority,
          comments: item.comment,
        };
      });

      return reply.send({
        success: true,
        items: mappedItems,
        total,
        pageNumber: pageIndex,
        pageLimit: pageSize,
      });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });

  // GET /api/followups/today - Today's follow-ups
  fastify.get("/followups/today", async (req, reply) => {
    try {
      const { companyId, userId } = req.user;

      // Start & end of today in local time zone offset (e.g. IST)
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);

      const items = await prisma.followUp.findMany({
        where: {
          companyId,
          userId,
          date: {
            gte: todayStart,
            lt: todayEnd,
          },
        },
        orderBy: { time: "asc" },
        include: {
          project: {
            select: {
              id: true,
              projectName: true
            }
          }
        }
      });

      const mappedItems = items.map((item) => {
        let displayStatus = "OPEN";
        if (item.followUpStatus === "IN_PROGRESS") displayStatus = "PENDING";
        else if (item.followUpStatus === "CLOSED") displayStatus = "COMPLETED";

        return {
          id: item.id,
          lead_name: item.leadName,
          phone: item.leadPhone,
          email: item.leadEmail,
          date: item.date,
          time: item.time,
          followup_type: item.followUpType,
          project: item.project?.projectName || "",
          projectId: item.projectId,
          followup_status: displayStatus,
          priority: item.priority,
          comments: item.comment,
        };
      });

      return reply.send({
        success: true,
        followupToday: mappedItems,
        total: mappedItems.length,
      });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });

  // GET /api/followups/:id - Single follow-up
  fastify.get("/followups/:id", async (req, reply) => {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user;

      const item = await prisma.followUp.findUnique({
        where: { id },
      });

      if (!item || item.companyId !== companyId || item.userId !== userId) {
        return reply.code(404).send({ success: false, message: "Follow-up not found" });
      }

      let displayStatus = "OPEN";
      if (item.followUpStatus === "IN_PROGRESS") displayStatus = "PENDING";
      else if (item.followUpStatus === "CLOSED") displayStatus = "COMPLETED";

      const mapped = {
        id: item.id,
        lead_name: item.leadName,
        phone: item.leadPhone,
        email: item.leadEmail,
        date: item.date,
        time: item.time,
        followup_type: item.followUpType,
        project: item.projectId || "", // Maps back to project selector
        projectId: item.projectId,
        followup_status: displayStatus,
        priority: item.priority,
        comments: item.comment,
      };

      return reply.send({ success: true, followup: mapped });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });

  // POST /api/followups - Create a follow-up
  fastify.post("/followups", async (req, reply) => {
    try {
      const { companyId, userId } = req.user;
      const { lead_name, phone, email, date, time, followup_type, project, followup_status, priority, comments } = req.body;

      if (!lead_name) {
        return reply.code(400).send({ success: false, message: "Lead name is required" });
      }

      let dbStatus = "OPEN";
      if (followup_status) {
        const s = followup_status.toUpperCase();
        if (s === "OPEN") dbStatus = "OPEN";
        else if (s === "PENDING" || s === "IN_PROGRESS") dbStatus = "IN_PROGRESS";
        else if (s === "COMPLETED" || s === "CLOSED") dbStatus = "CLOSED";
      }

      let dbPriority = "LOW";
      if (priority) {
        const p = priority.toUpperCase();
        if (["LOW", "MEDIUM", "HIGH"].includes(p)) {
          dbPriority = p;
        }
      }

      const item = await prisma.followUp.create({
        data: {
          leadName: lead_name,
          leadPhone: phone || null,
          leadEmail: email || null,
          date: new Date(date),
          time: time || "00:00",
          followUpType: followup_type || "Call",
          projectId: (project && project !== "") ? project : null,
          followUpStatus: dbStatus,
          priority: dbPriority,
          comment: comments || null,
          userId,
          companyId,
        },
      });

      return reply.code(201).send({ success: true, message: "Follow-up created successfully", followup: item });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: err.message || "Internal server error" });
    }
  });

  // PUT /api/followups - Update a follow-up
  fastify.put("/followups", async (req, reply) => {
    try {
      const { companyId, userId } = req.user;
      const { id, lead_name, phone, email, date, time, followup_type, project, followup_status, priority, comments } = req.body;

      const existing = await prisma.followUp.findUnique({ where: { id } });

      if (!existing || existing.companyId !== companyId || existing.userId !== userId) {
        return reply.code(404).send({ success: false, message: "Follow-up not found" });
      }

      let dbStatus = existing.followUpStatus;
      if (followup_status) {
        const s = followup_status.toUpperCase();
        if (s === "OPEN") dbStatus = "OPEN";
        else if (s === "PENDING" || s === "IN_PROGRESS") dbStatus = "IN_PROGRESS";
        else if (s === "COMPLETED" || s === "CLOSED") dbStatus = "CLOSED";
      }

      let dbPriority = existing.priority;
      if (priority) {
        const p = priority.toUpperCase();
        if (["LOW", "MEDIUM", "HIGH"].includes(p)) {
          dbPriority = p;
        }
      }

      const updated = await prisma.followUp.update({
        where: { id },
        data: {
          leadName: lead_name !== undefined ? lead_name : existing.leadName,
          leadPhone: phone !== undefined ? phone : existing.leadPhone,
          leadEmail: email !== undefined ? email : existing.leadEmail,
          date: date !== undefined ? new Date(date) : existing.date,
          time: time !== undefined ? time : existing.time,
          followUpType: followup_type !== undefined ? followup_type : existing.followUpType,
          projectId: project !== undefined ? ((project && project !== "") ? project : null) : existing.projectId,
          followUpStatus: dbStatus,
          priority: dbPriority,
          comment: comments !== undefined ? comments : existing.comment,
        },
      });

      return reply.send({ success: true, message: "Follow-up updated successfully", followup: updated });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });

  // PUT /api/followups/status - Update follow-up status only
  fastify.put("/followups/status", async (req, reply) => {
    try {
      const { companyId, userId } = req.user;
      const { id, followup_status } = req.body;

      const existing = await prisma.followUp.findUnique({ where: { id } });

      if (!existing || existing.companyId !== companyId || existing.userId !== userId) {
        return reply.code(404).send({ success: false, message: "Follow-up not found" });
      }

      let dbStatus = "OPEN";
      if (followup_status) {
        const s = followup_status.toUpperCase();
        if (s === "OPEN") dbStatus = "OPEN";
        else if (s === "PENDING" || s === "IN_PROGRESS") dbStatus = "IN_PROGRESS";
        else if (s === "COMPLETED" || s === "CLOSED") dbStatus = "CLOSED";
      }

      const updated = await prisma.followUp.update({
        where: { id },
        data: { followUpStatus: dbStatus },
      });

      return reply.send({ success: true, message: "Follow-up status updated successfully", followup: updated });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });

  // DELETE /api/followups/:id - Delete a follow-up
  fastify.delete("/followups/:id", async (req, reply) => {
    try {
      const { id } = req.params;
      const { companyId, userId } = req.user;

      const existing = await prisma.followUp.findUnique({ where: { id } });

      if (!existing || existing.companyId !== companyId || existing.userId !== userId) {
        return reply.code(404).send({ success: false, message: "Follow-up not found" });
      }

      await prisma.followUp.delete({ where: { id } });

      return reply.send({ success: true, message: "Follow-up deleted successfully" });
    } catch (err) {
      req.log.error(err);
      return reply.code(500).send({ success: false, message: "Internal server error" });
    }
  });
}
