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
      const updated = await fastify.prisma.request.update({
        where: { id },
        data: { status }
      });

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
