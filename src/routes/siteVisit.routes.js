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
      const { leadName, phone, date, time, siteVisitPicture, userId } = req.body;
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
      const { leadName, phone, date, time, siteVisitPicture, userId } = req.body;

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
};
