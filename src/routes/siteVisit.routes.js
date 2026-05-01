import authMiddleware from "../middlewares/auth.middleware.js";

export const siteVisitRoutes = async (fastify, options) => {
  fastify.addHook("preHandler", authMiddleware);

  // GET all site visits with search and pagination
  fastify.get("/site-visits", async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { search, page = 1, limit = 10, userId } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        AND: [
          {
            OR: [
              { user: { companyId } },
              { telecaller: { companyId } }
            ]
          },
          userId ? {
            OR: [
              { userId },
              { telecallerId: userId }
            ]
          } : {},
          search ? {
            OR: [
              { leadName: { contains: search, mode: 'insensitive' } },
              { phone: { contains: search, mode: 'insensitive' } },
            ]
          } : {}
        ]
      };

      const [items, total] = await Promise.all([
        fastify.prisma.siteVisit.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { date: 'desc' },
          include: {
            user: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              }
            },
            telecaller: {
              select: {
                firstName: true,
                lastName: true,
                username: true,
                phone: true,
              }
            }
          }
        }),
        fastify.prisma.siteVisit.count({ where })
      ]);

      // Flatten the creator info
      const mappedItems = items.map(item => ({
        ...item,
        creator: item.user || item.telecaller || null
      }));

      return res.code(200).send({
        success: true,
        items: mappedItems,
        data: mappedItems,
        total,
        page: parseInt(page),
        totalPages: Math.ceil(total / parseInt(limit)),
        message: "Site visits fetched successfully"
      });
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // GET today's site visits
  fastify.get("/site-visits/today", async (req, res) => {
    try {
      const companyId = req.user.companyId;
      const { userId } = req.query;
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);

      const where = {
        date: {
          gte: today,
          lt: tomorrow
        },
        OR: [
          { user: { companyId } },
          { telecaller: { companyId } }
        ],
        ...(userId && { 
            OR: [
                { userId },
                { telecallerId: userId }
            ]
        })
      };

      const items = await fastify.prisma.siteVisit.findMany({
        where,
        orderBy: { time: 'asc' },
        include: {
          user: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            }
          },
          telecaller: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
            }
          }
        }
      });

      const mappedItems = items.map(item => ({
        ...item,
        creator: item.user || item.telecaller || null
      }));

      return res.code(200).send({
        success: true,
        items: mappedItems,
        total: items.length
      });
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // GET single site visit
  fastify.get("/site-visits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await fastify.prisma.siteVisit.findUnique({
        where: { id },
        include: { 
            user: true,
            telecaller: true
        }
      });

      if (!item) {
        return res.code(404).send({ success: false, message: "Site visit not found" });
      }

      return res.code(200).send({ 
          success: true, 
          item: {
              ...item,
              creator: item.user || item.telecaller || null
          } 
      });
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // POST create site visit
  fastify.post("/site-visits", async (req, res) => {
    try {
      const { leadName, phone, date, time, siteVisitPicture, userId, projectId } = req.body;
      const userType = req.user.userType;

      if (!leadName || !phone || !date || !time || !userId) {
        return res.code(400).send({ success: false, message: "Missing required fields" });
      }

      const item = await fastify.prisma.siteVisit.create({
        data: {
          leadName,
          phone,
          date: new Date(date),
          time,
          siteVisitPicture,
          projectId,
          userId, // Mandatory in schema
          telecallerId: userType === 'telecaller' ? userId : null,
          changeLog: JSON.stringify([{
            action: 'CREATED',
            at: new Date(),
            by: userId
          }])
        }
      });

      return res.code(201).send({ success: true, item, message: "Site visit created successfully" });
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // PUT update site visit
  fastify.put("/site-visits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const { leadName, phone, date, time, siteVisitPicture, userId, projectId } = req.body;

      const existing = await fastify.prisma.siteVisit.findUnique({ where: { id } });
      if (!existing) {
        return res.code(404).send({ success: false, message: "Site visit not found" });
      }

      const currentLog = existing.changeLog ? JSON.parse(existing.changeLog) : [];
      const newLog = [
        ...currentLog,
        {
          action: 'UPDATED',
          at: new Date(),
          by: userId,
          changes: { leadName, phone, date, time, siteVisitPicture }
        }
      ];

      const item = await fastify.prisma.siteVisit.update({
        where: { id },
        data: {
          leadName,
          phone,
          date: date ? new Date(date) : undefined,
          time,
          siteVisitPicture,
          projectId,
          changeLog: JSON.stringify(newLog)
        }
      });

      return res.code(200).send({ success: true, item, message: "Site visit updated successfully" });
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // DELETE site visit
  fastify.delete("/site-visits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await fastify.prisma.siteVisit.delete({ where: { id } });
      return res.code(200).send({ success: true, message: "Site visit deleted successfully" });
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // ================= VEHICLE ROUTES =================

  // GET all vehicles
  fastify.get("/site-visits/vehicles", async (req, res) => {
    try {
      const { companyId } = req.user;
      const items = await fastify.prisma.vehicle.findMany({
        where: { companyId },
        orderBy: { vehicleName: 'asc' }
      });
      return { success: true, items };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // POST create vehicle
  fastify.post("/site-visits/vehicles", async (req, res) => {
    try {
      const { companyId } = req.user;
      const item = await fastify.prisma.vehicle.create({
        data: { ...req.body, companyId }
      });
      return { success: true, item };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // PUT update vehicle
  fastify.put("/site-visits/vehicles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await fastify.prisma.vehicle.update({
        where: { id },
        data: req.body
      });
      return { success: true, item };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // DELETE vehicle
  fastify.delete("/site-visits/vehicles/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await fastify.prisma.vehicle.delete({ where: { id } });
      return { success: true, message: "Vehicle deleted" };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // ================= VEHICLE SITE VISIT ROUTES =================

  // GET all vehicle visits
  fastify.get("/site-visits/vehicle-site-visits", async (req, res) => {
    try {
      const { companyId } = req.user;
      const { page = 1, limit = 10, associateId } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        companyId,
        ...(associateId && { associateId })
      };

      const [items, total] = await Promise.all([
        fastify.prisma.vehicleSiteVisit.findMany({
          where,
          skip,
          take: parseInt(limit),
          orderBy: { date: 'desc' },
          include: { vehicle: true }
        }),
        fastify.prisma.vehicleSiteVisit.count({ where })
      ]);

      return { success: true, items, total };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // POST create vehicle visit
  fastify.post("/site-visits/vehicle-site-visits", async (req, res) => {
    try {
      const { companyId } = req.user;
      const { startKms, endKms } = req.body;

      // KM Validation
      if (startKms && endKms && parseFloat(endKms) <= parseFloat(startKms)) {
        return res.code(400).send({ 
          success: false, 
          message: "End KM must be greater than Start KM" 
        });
      }

      const data = { 
        ...req.body, 
        companyId,
        date: new Date(req.body.date)
      };
      const item = await fastify.prisma.vehicleSiteVisit.create({ data });
      return { success: true, item };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // DELETE vehicle visit
  fastify.delete("/site-visits/vehicle-site-visits/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await fastify.prisma.vehicleSiteVisit.delete({ where: { id } });
      return { success: true, message: "Log deleted" };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });

  // PATCH approve/reject vehicle visit
  fastify.patch("/site-visits/vehicle-site-visits/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body; // APPROVED or REJECTED
      const { id: approvedBy, companyId } = req.user;

      const trip = await fastify.prisma.vehicleSiteVisit.update({
        where: { id },
        data: { status, approvedBy },
        include: { vehicle: true }
      });

      // If approved, create a corresponding finance expense entry automatically
      if (status === "APPROVED") {
        await fastify.prisma.associateExpense.create({
          data: {
            associateId: trip.associateId,
            associateName: trip.associateName,
            userAuthId: trip.userAuthId || "",
            teamHeadId: trip.teamHeadId || "",
            teamHeadName: trip.teamHeadName || "",
            date: trip.date,
            expenseType: "SITE_VISIT",
            siteVisitId: trip.id,
            amountSpent: trip.totalAmountSpent,
            description: `Auto-generated from Site Visit (${trip.id})`,
            companyId,
            paymentReceipt: trip.paymentReceipt
          }
        });
      }

      return { success: true, item: trip };
    } catch (err) {
      req.log.error(err);
      return res.code(500).send({ success: false, error: err.message });
    }
  });
}
