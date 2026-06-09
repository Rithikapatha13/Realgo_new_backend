import authMiddleware from "../middlewares/auth.middleware.js";
import XLSX from "xlsx";

// Basic implementation of the CRM (Leads + Dual Pipeline) merged into Realgo Fastify structure

export default async function crmRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // =====================================================
    // HELPER — CREATE NOTIFICATION
    // =====================================================
    async function createCrmNotification({ title, body, notificationType, companyId, userId, telecallerId, adminId }) {
        try {
            const company = await prisma.company.findUnique({
                where: { id: companyId },
                select: { company: true }
            });
            const companyName = company ? company.company : "Realgo";

            await prisma.notification.create({
                data: {
                    title,
                    body,
                    notificationType,
                    companyId,
                    companyName,
                    status: "UNREAD",
                    isRead: false,
                    userId: userId || null,
                    telecallerId: telecallerId || null,
                    adminId: adminId || null
                }
            });
        } catch (err) {
            console.error("Failed to create notification:", err);
        }
    }

    // =====================================================
    // HELPER — LOAD BALANCED TELECALLER DISTRIBUTION
    // =====================================================
async function getTelecallerForLead(companyId) {
    const MIN_ACTIVE_LEADS = 3;
    const MAX_CAPACITY = 10;

    // 1. Fetch dedicated telecallers (online & available first)
    let telecallers = await prisma.telecaller.findMany({
        where: { companyId, isOnline: true, availability: "AVAILABLE" },
        include: { _count: { select: { leads: true } } }
    });

    // 2. Fallback: If no online telecallers, get any VERIFIED telecaller
    if (telecallers.length === 0) {
        telecallers = await prisma.telecaller.findMany({
            where: { companyId, status: "VERIFIED" },
            include: { _count: { select: { leads: true } } }
        });
    }

    // Mark all as dedicated TC (from Telecaller table)
    telecallers = telecallers.map(t => ({ ...t, isDedicated: true }));

    if (telecallers.length > 0) {
        // filter by capacity
        const available = telecallers.filter(t => t._count.leads < MAX_CAPACITY);
        if (available.length > 0) {
            const belowMin = available.filter(t => t._count.leads < MIN_ACTIVE_LEADS);
            if (belowMin.length > 0) {
                belowMin.sort((a, b) => a._count.leads - b._count.leads);
                return { id: belowMin[0].id, isDedicatedTC: true };
            }
            // otherwise select the least loaded
            available.sort((a, b) => a._count.leads - b._count.leads);
            return { id: available[0].id, isDedicatedTC: true };
        }
    }
    return null;
}







    // =====================================================
    // GET ASSIGNABLE ONLINE TELECALLER
    // =====================================================
    fastify.get("/assign-telecaller", async (req, reply) => {
        try {
            const companyId = req.user.companyId;
            const assignedTC = await getTelecallerForLead(companyId);
            if (assignedTC) {
                return reply.send({
                    success: true,
                    id: assignedTC.id,
                    isDedicatedTC: assignedTC.isDedicatedTC
                });
            }
            return reply.send({ success: false, message: "No online telecallers available" });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });


    // =====================================================
    // GET LEADS (Dual Pipeline + Role-based access)
    // =====================================================
    fastify.get("/leads", async (req, reply) => {
        try {
            const { status, search, today, fromDate, toDate } = req.query;
            const companyId = req.user.companyId;
            const roleName = (req.user.role?.roleName || "").toUpperCase();
            const userType = (req.user.userType || "").toLowerCase();

            const where = { companyId };

            // 1. Role Filters
            const isTC = userType === "telecaller";
            const isAdminTC = userType === "admin" && roleName === "TELECALLER ADMIN";
            const isAccountant = roleName === "ACCOUNTANT" || roleName === "ACCOUNTS";
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin");

            if (isTC) {
                // Dedicated Telecaller table
                where.dedicatedTCId = req.user.userId;
                where.NOT = {
                    addedByRole: "ASSOCIATE"
                };
            } else if (!isAdmin && !isAccountant) {
                // Associate
                where.associateId = req.user.userId;
            }

            // 2. Status Filters
            if (status && status !== "ALL") {
                if (["NEW", "HOT", "WARM", "COLD", "LATER"].includes(status)) {
                    where.leadStatus = status;
                    where.OR = [
                        { assocStatus: null },
                        { assocStatus: { notIn: ["BOOKED", "PAYMENT_PENDING"] } }
                    ];
                }
                if (["SITEVISIT", "INTERESTED", "FOLLOWUP", "BOOKED", "PAYMENT_PENDING"].includes(status)) {
                    where.assocStatus = status;
                }
                if (status === "UNASSIGNED") {
                    where.dedicatedTCId = null;
                    where.adminTCId = null;
                }
            }

            // 3. Date Filters
            if (today === "true") {
                const startOfDay = new Date();
                startOfDay.setHours(0, 0, 0, 0);
                where.createdAt = { gte: startOfDay };
            } else if (fromDate || toDate) {
                where.createdAt = {};
                if (fromDate) where.createdAt.gte = new Date(fromDate);
                if (toDate) {
                    const endOfDay = new Date(toDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    where.createdAt.lte = endOfDay;
                }
            }

            // 4. Search Filter
            if (search) {
                where.OR = [
                    { leadName: { contains: search, mode: "insensitive" } },
                    { leadContact: { contains: search } }
                ];
            }

            const leadsData = await prisma.lead.findMany({
                where,
                include: {
                    dedicatedTC: { select: { id: true, firstName: true, lastName: true, image: true } },
                    adminTC: { select: { id: true, firstName: true, lastName: true, image: true } },
                    telecaller: { select: { id: true, firstName: true, lastName: true } },
                    associate: { 
                        select: { 
                            id: true, 
                            firstName: true, 
                            lastName: true, 
                            image: true,
                            role: { select: { roleName: true } }
                        } 
                    },
                    user: { 
                        select: { 
                            id: true, 
                            firstName: true, 
                            lastName: true,
                            role: { select: { roleName: true } }
                        } 
                    },
                    assignedBy: { 
                        select: { 
                            id: true, 
                            firstName: true, 
                            lastName: true,
                            role: { select: { roleName: true } }
                        } 
                    },
                    _count: {
                        select: { callLogs: true, meetings: true }
                    }
                },
                orderBy: { updatedAt: "desc" }
            });

            const leads = leadsData.map(l => {
                let displayAddedByName = l.addedByName;
                let displayAddedByRole = l.addedByRole;

                if (!displayAddedByName) {
                    if (l.associate) {
                        displayAddedByName = `${l.associate.firstName || ""} ${l.associate.lastName || ""}`.trim();
                        displayAddedByRole = l.associate.role?.roleName || "ASSOCIATE";
                    } else if (l.assignedBy) {
                        displayAddedByName = `${l.assignedBy.firstName || ""} ${l.assignedBy.lastName || ""}`.trim();
                        displayAddedByRole = l.assignedBy.role?.roleName || "ADMIN";
                    } else if (l.user) {
                        displayAddedByName = `${l.user.firstName || ""} ${l.user.lastName || ""}`.trim();
                        displayAddedByRole = l.user.role?.roleName || "ADMIN";
                    }
                }

                return {
                    ...l,
                    addedByName: displayAddedByName,
                    addedByRole: displayAddedByRole,
                    interactionCount: l._count.callLogs + l._count.meetings
                };
            });

            return reply.send({ success: true, leads });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // =====================================================
    // CREATE LEAD (Manual / Associate Self-Sourced / TC Admin)
    // =====================================================
    fastify.post("/leads", async (req, reply) => {
        try {
            const {
                leadName,
                leadContact,
                leadEmail,
                leadCity,
                leadSource,
                description,
                projectInterestedIn
            } = req.body;

            const companyId = req.user.companyId;

            if (!leadName || !leadContact) {
                return reply.code(400).send({ success: false, message: "Name and phone are required" });
            }

            // Duplicate check within company
            const existing = await prisma.lead.findFirst({
                where: { leadContact, companyId }
            });

            if (existing) {
                return reply.code(400).send({ success: false, message: "Lead with this phone already exists in this company" });
            }

            // Determine Pipeline Context based on who is creating the lead
            const userType = (req.user.userType || "").toLowerCase();
            const roleName = (req.user.role?.roleName || "").toUpperCase();
            
            const isTC = userType === "telecaller";
            const isAdminTC = userType === "admin" && roleName === "TELECALLER ADMIN";
            const isTelecaller = roleName === "TELECALLER";
            const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";
            const isAssociate = !isAdmin && !isTC && !isAdminTC;

            let dedicatedTCId = req.body.dedicatedTCId || (isTC ? req.user.userId : null);
            let adminTCId = req.body.adminTCId || null;

            // Note: Telecaller Admins should NOT self-assign adminTCId.
            // Leads created by them get auto-distributed to telecallers below.

            let associateId = isAssociate ? req.user.userId : null;

            // Auto-assign to telecaller if Admin creates and no assignment was sent
            if (isAdmin && !associateId && !dedicatedTCId && !adminTCId) {
                const assignedTC = await getTelecallerForLead(companyId);
                if (assignedTC) {
                    if (assignedTC.isDedicatedTC) {
                        dedicatedTCId = assignedTC.id;
                    } else {
                        // Verify this ID actually exists in Admin table before setting
                        const verifyAdmin = await prisma.admin.findUnique({ where: { id: assignedTC.id } });
                        if (verifyAdmin) {
                            adminTCId = assignedTC.id;
                        }
                    }
                }
            }

            // Validate all FK references before inserting
            // 1. userId (mandatory) - must exist in User table
            let creatorUserId = null;
            if (isAdmin || isAdminTC) {
                const fallbackUser = await prisma.user.findFirst({ where: { companyId } });
                if (fallbackUser) {
                    creatorUserId = fallbackUser.id;
                } else {
                    return reply.code(400).send({ success: false, message: "No active users found in this company to assign as lead creator." });
                }
            } else {
                // Verify req.user.userId exists in User table
                const userCheck = await prisma.user.findUnique({ where: { id: req.user.userId } });
                if (userCheck) {
                    creatorUserId = req.user.userId;
                } else {
                    const fallbackUser = await prisma.user.findFirst({ where: { companyId } });
                    creatorUserId = fallbackUser?.id || null;
                    if (!creatorUserId) {
                        return reply.code(400).send({ success: false, message: "No valid user found for lead creation." });
                    }
                }
            }

            // 2. assignedById - must exist in User table (nullable)
            let assignedById = null;
            if (req.user.userId) {
                const userRecord = await prisma.user.findUnique({ where: { id: req.user.userId } });
                if (userRecord) {
                    assignedById = req.user.userId;
                }
            }

            // 3. Validate dedicatedTCId exists in Telecaller table
            if (dedicatedTCId) {
                const tcCheck = await prisma.telecaller.findUnique({ where: { id: dedicatedTCId } });
                if (!tcCheck) dedicatedTCId = null;
            }

            // 4. Validate adminTCId exists in Admin table
            if (adminTCId) {
                const adminCheck = await prisma.admin.findUnique({ where: { id: adminTCId } });
                if (!adminCheck) adminTCId = null;
            }

            // 5. Validate associateId exists in User table
            if (associateId) {
                const assocCheck = await prisma.user.findUnique({ where: { id: associateId } });
                if (!assocCheck) associateId = null;
            }

            console.log("DEBUG_LEAD_CREATE:", {
                leadName,
                leadContact,
                companyId,
                creatorUserId,
                dedicatedTCId,
                adminTCId,
                associateId,
                assignedById,
                isTC,
                isAdminTC,
                isAssociate,
                isAdmin
            });

            const addedByName = req.user.firstName 
                ? `${req.user.firstName} ${req.user.lastName || ""}`.trim()
                : (req.user.username || "System");

            let addedByRole = "SYSTEM";
            if (userType === "telecaller") {
                addedByRole = "TELECALLER";
            } else if (userType === "admin" && roleName === "TELECALLER ADMIN") {
                addedByRole = "TELECALLER ADMIN";
            } else if (isAdmin) {
                addedByRole = "ADMIN";
            } else {
                addedByRole = "ASSOCIATE";
            }

            const newLead = await prisma.lead.create({
                data: {
                    leadName,
                    leadContact,
                    leadEmail,
                    leadCity,
                    leadSource: leadSource || "OTHER",
                    description,
                    projectInterestedIn,
                    leadStatus: "NEW", 
                    date: new Date(),
                    companyId: companyId,
                    userId: creatorUserId,
                    dedicatedTCId,
                    adminTCId,
                    associateId,
                    assignedById,
                    addedByName,
                    addedByRole
                }
            });

            // Send notification to assigned telecaller
            if (newLead.dedicatedTCId) {
                await createCrmNotification({
                    title: "New Lead Assigned",
                    body: `Lead ${newLead.leadName} has been assigned to you.`,
                    notificationType: "LEAD_ASSIGNMENT",
                    companyId: newLead.companyId,
                    telecallerId: newLead.dedicatedTCId
                });
            } else if (newLead.adminTCId) {
                await createCrmNotification({
                    title: "New Lead Assigned",
                    body: `Lead ${newLead.leadName} has been assigned to you.`,
                    notificationType: "LEAD_ASSIGNMENT",
                    companyId: newLead.companyId,
                    adminId: newLead.adminTCId
                });
            }

            return reply.code(201).send({ success: true, lead: newLead });

        } catch (err) {
            console.error("LEAD_CREATE_ERROR:", err);
            return reply.code(500).send({ success: false, message: "Internal server error", error: err.message });
        }
    });

    // =====================================================
    // UPDATE LEAD STATUS / LOG CALL (Telecaller & Associate)
    // =====================================================
    fastify.patch("/leads/:id/call", async (req, reply) => {
        try {
            const { id } = req.params;
            const { status, notes, callbackAt, isAssociateUpdate } = req.body;

            const companyId = req.user.companyId;
            const roleName = (req.user.role?.roleName || "").toUpperCase();

            // Validate ownership/access
            let lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead || lead.companyId !== companyId) {
                return reply.code(404).send({ success: false, message: "Lead not found" });
            }

            // Determine if updating telecaller status (HOT/COLD) or Assoc status (SITEVISIT)
            let updateData = {};
            
            const isTelecaller = roleName === "TELECALLER";
            const userType = (req.user.userType || "").toLowerCase();
            const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";
            const isAssociate = !isAdmin && !isTelecaller;

            if (isAssociateUpdate || isAssociate) {
                updateData.assocStatus = status;
                updateData.notes = notes;
            } else {
                updateData.leadStatus = status;
                updateData.notes = notes;
            }

            lead = await prisma.lead.update({
                where: { id },
                data: updateData
            });

            // Log the call history into Realgo CallLog (if Telecaller is making it)
            if (userType === "telecaller" || (userType === "admin" && roleName === "TELECALLER ADMIN")) {
                await prisma.callLog.create({
                    data: {
                        leadId: id,
                        dedicatedTCId: userType === "telecaller" ? req.user.userId : null,
                        adminTCId: userType === "admin" ? req.user.userId : null,
                        status: status,
                        notes: notes,
                        callbackAt: callbackAt ? new Date(callbackAt) : null
                    }
                });

                // COLD LEAD ALERT (5x CONSECUTIVE COLD CALLS)
                if (status === "COLD") {
                    const lastLogs = await prisma.callLog.findMany({
                        where: { leadId: id },
                        orderBy: { createdAt: "desc" },
                        take: 5
                    });

                    if (lastLogs.length >= 5 && lastLogs.every(l => l.status === "COLD")) {
                        await prisma.eventLog.create({
                            data: {
                                category: "LEAD_ALERT",
                                actionBy: req.user.username || "System",
                                actionDescription: `REASSIGN LEAD: Lead ${lead.leadName} has been marked COLD 5 times consecutively by ${req.user.firstName || req.user.username}.`,
                                companyId
                            }
                        });
                    }
                }
            }

            // Escalate to Associate (Auto-Assignment for HOT leads using weighted multi-bucket performance balancer)
            if (!isAssociateUpdate && !isAssociate && status === "HOT" && !lead.associateId) {
                let associates = await prisma.user.findMany({
                    where: {
                        companyId,
                        status: "VERIFIED",
                        isOnline: true,
                        availability: "AVAILABLE"
                    },
                    include: {
                        _count: {
                            select: { associateLeads: true }
                        }
                    }
                });

                // Fallback: If no online available associates are found, grab any verified associates
                if (associates.length === 0) {
                    associates = await prisma.user.findMany({
                        where: {
                            companyId,
                            status: "VERIFIED"
                        },
                        include: {
                            _count: {
                                select: { associateLeads: true }
                            }
                        }
                    });
                }

                if (associates.length > 0) {
                    const MIN_ASSOCIATE_LEADS = 2;
                    const MAX_ASSOCIATE_CAPACITY = 10;

                    const available = associates.filter(
                        a => a._count.associateLeads < MAX_ASSOCIATE_CAPACITY
                    );

                    if (available.length > 0) {
                        let selected = null;

                        const belowMinimum = available.filter(
                            a => a._count.associateLeads < MIN_ASSOCIATE_LEADS
                        );

                        if (belowMinimum.length > 0) {
                            belowMinimum.sort(
                                (a, b) => a._count.associateLeads - b._count.associateLeads
                            );
                            selected = belowMinimum[0];
                        } else {
                            const sorted = available.sort(
                                (a, b) => (b.performanceScore || 0) - (a.performanceScore || 0)
                            );

                            const topBucket = sorted.slice(0, Math.ceil(sorted.length * 0.3));
                            const midBucket = sorted.slice(
                                Math.ceil(sorted.length * 0.3),
                                Math.ceil(sorted.length * 0.7)
                            );
                            const lowBucket = sorted.slice(Math.ceil(sorted.length * 0.7));

                            const r = Math.random();
                            let pool = [];

                            if (r < 0.5) pool = topBucket;
                            else if (r < 0.8) pool = midBucket;
                            else pool = lowBucket;

                            if (pool.length === 0) pool = available;

                            pool.sort(
                                (a, b) => a._count.associateLeads - b._count.associateLeads
                            );

                            selected = pool[0];
                        }

                        if (selected) {
                            lead = await prisma.lead.update({
                                where: { id },
                                data: { associateId: selected.id },
                                include: {
                                    dedicatedTC: { select: { id: true, firstName: true, lastName: true } },
                                    adminTC: { select: { id: true, firstName: true, lastName: true } },
                                    telecaller: { select: { id: true, firstName: true, lastName: true } },
                                    associate: { select: { id: true, firstName: true, lastName: true } }
                                }
                            });

                            // Create an EventLog entry for the auto-transfer
                            await prisma.eventLog.create({
                                data: {
                                    category: "LEAD_ESCALATION",
                                    actionBy: req.user.username || "System",
                                    actionDescription: `Lead ${lead.leadName} transferred to associate ${selected.firstName || selected.username} by ${req.user.firstName || req.user.username}`,
                                    companyId
                                }
                            });

                            // Notify Associate
                            await createCrmNotification({
                                title: "New Lead Assigned",
                                body: `Lead ${lead.leadName} has been escalated and assigned to you as HOT.`,
                                notificationType: "LEAD_ASSIGNMENT",
                                companyId: lead.companyId,
                                userId: selected.id
                            });

                            // Notify all Admins who have CRM module access
                            const admins = await prisma.admin.findMany({
                                where: {
                                    companyId,
                                    role: {
                                        modules: {
                                            has: "CRM"
                                        }
                                    }
                                }
                            });
                            for (const admin of admins) {
                                await createCrmNotification({
                                    title: "Lead Escalated to Associate",
                                    body: `Lead ${lead.leadName} was escalated to associate ${selected.firstName || selected.username}.`,
                                    notificationType: "LEAD_TRANSFER",
                                    companyId: lead.companyId,
                                    adminId: admin.id
                                });
                            }
                        }
                    }
                }
            }

            return reply.send({ success: true, lead });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // =====================================================
    // ASSIGN/ESCALATE LEAD (Admin dispatch or Telecaller manual escalate)
    // =====================================================
    fastify.patch("/leads/:id/assign", async (req, reply) => {
        try {
            const { id } = req.params;
            const { telecallerId, associateId } = req.body;
            const companyId = req.user.companyId;

            let lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead || lead.companyId !== companyId) {
                return reply.code(404).send({ success: false, message: "Lead not found" });
            }

            const userType = (req.user.userType || "").toLowerCase();
            const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";

            let assignedById = null;
            if (!isAdmin && req.user.userId) {
                const userRecord = await prisma.user.findUnique({ where: { id: req.user.userId } });
                if (userRecord) {
                    assignedById = req.user.userId;
                }
            }

            // Check if telecallerId provided is for Telecaller table or Admin table
            // In a production app, the frontend should ideally specify, but we can check if it exists in Admin
            let assignData = {
                associateId: associateId !== undefined ? associateId : undefined,
                assignedById
            };

            if (telecallerId !== undefined) {
                const isAdminUser = telecallerId ? await prisma.admin.findUnique({ where: { id: telecallerId } }) : null;
                if (isAdminUser) {
                    assignData.adminTCId = telecallerId;
                    assignData.dedicatedTCId = null;
                } else {
                    assignData.dedicatedTCId = telecallerId;
                    assignData.adminTCId = null;
                }
            }

            lead = await prisma.lead.update({
                where: { id },
                data: assignData
            });

            // Trigger notifications for assignment changes
            if (telecallerId !== undefined) {
                if (lead.dedicatedTCId) {
                    await createCrmNotification({
                        title: "Lead Assigned",
                        body: `Lead ${lead.leadName} has been assigned to you.`,
                        notificationType: "LEAD_ASSIGNMENT",
                        companyId: lead.companyId,
                        telecallerId: lead.dedicatedTCId
                    });
                } else if (lead.adminTCId) {
                    await createCrmNotification({
                        title: "Lead Assigned",
                        body: `Lead ${lead.leadName} has been assigned to you.`,
                        notificationType: "LEAD_ASSIGNMENT",
                        companyId: lead.companyId,
                        adminId: lead.adminTCId
                    });
                }
            }

            if (associateId !== undefined && associateId) {
                // Notify Associate
                await createCrmNotification({
                    title: "New Lead Assigned",
                    body: `Lead ${lead.leadName} has been assigned to you.`,
                    notificationType: "LEAD_ASSIGNMENT",
                    companyId: lead.companyId,
                    userId: associateId
                });

                // Notify all Admins who have CRM module access
                const admins = await prisma.admin.findMany({
                    where: {
                        companyId,
                        role: {
                            modules: {
                                has: "CRM"
                            }
                        }
                    }
                });
                for (const admin of admins) {
                    await createCrmNotification({
                        title: "Lead Transferred to Associate",
                        body: `Lead ${lead.leadName} was transferred to associate by ${req.user.firstName || req.user.username}.`,
                        notificationType: "LEAD_TRANSFER",
                        companyId: lead.companyId,
                        adminId: admin.id
                    });
                }
            }

            return reply.send({ success: true, lead });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // =====================================================
    // CRM DASHBOARD STATS
    // =====================================================
    fastify.get("/stats", async (req, reply) => {
        try {
            const companyId = req.user.companyId;
            const roleName = (req.user.role?.roleName || "").toUpperCase();
            const userType = (req.user.userType || "").toLowerCase();

            const isTC = userType === "telecaller";
            const isAdminTC = userType === "admin" && roleName === "TELECALLER ADMIN";
            const isAccountant = roleName === "ACCOUNTANT" || roleName === "ACCOUNTS";
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin");
            const isAssociate = !isAdmin && !isTC && !isAccountant;

            const baseWhere = { companyId };
            
            if (isTC) {
                baseWhere.dedicatedTCId = req.user.userId;
                baseWhere.NOT = {
                    addedByRole: "ASSOCIATE"
                };
            } else if (isAssociate) {
                baseWhere.associateId = req.user.userId;
            }

            const [
                total,
                hot,
                warm,
                cold,
                newL,
                later,
                unassigned,
                sitevisits,
                booked,
                paymentPending
            ] = await Promise.all([
                prisma.lead.count({ where: baseWhere }),
                prisma.lead.count({ 
                    where: { 
                        ...baseWhere, 
                        leadStatus: 'HOT',
                        OR: [
                            { assocStatus: null },
                            { assocStatus: { notIn: ['BOOKED', 'PAYMENT_PENDING'] } }
                        ]
                    } 
                }),
                prisma.lead.count({ 
                    where: { 
                        ...baseWhere, 
                        leadStatus: 'WARM',
                        OR: [
                            { assocStatus: null },
                            { assocStatus: { notIn: ['BOOKED', 'PAYMENT_PENDING'] } }
                        ]
                    } 
                }),
                prisma.lead.count({ 
                    where: { 
                        ...baseWhere, 
                        leadStatus: 'COLD',
                        OR: [
                            { assocStatus: null },
                            { assocStatus: { notIn: ['BOOKED', 'PAYMENT_PENDING'] } }
                        ]
                    } 
                }),
                prisma.lead.count({ 
                    where: { 
                        ...baseWhere, 
                        leadStatus: 'NEW',
                        OR: [
                            { assocStatus: null },
                            { assocStatus: { notIn: ['BOOKED', 'PAYMENT_PENDING'] } }
                        ]
                    } 
                }),
                prisma.lead.count({ 
                    where: { 
                        ...baseWhere, 
                        leadStatus: 'LATER',
                        OR: [
                            { assocStatus: null },
                            { assocStatus: { notIn: ['BOOKED', 'PAYMENT_PENDING'] } }
                        ]
                    } 
                }),
                prisma.lead.count({ where: { ...baseWhere, dedicatedTCId: null, adminTCId: null } }),
                prisma.lead.count({ where: { ...baseWhere, assocStatus: 'SITEVISIT' } }),
                prisma.lead.count({ where: { ...baseWhere, assocStatus: 'BOOKED' } }),
                prisma.lead.count({ where: { ...baseWhere, assocStatus: 'PAYMENT_PENDING' } })
            ]);

            // Simple Top Performers Logic
            const topTCs = await prisma.admin.findMany({
                where: { companyId },
                select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    telecallerLeads: {
                        where: { leadStatus: 'HOT' }
                    }
                },
                take: 5
            });

            const leadRankings = topTCs.map(t => ({
                id: t.id,
                name: `${t.firstName} ${t.lastName}`,
                score: t.telecallerLeads.length
            })).sort((a, b) => b.score - a.score);

            return reply.send({
                success: true,
                stats: {
                    total, hot, warm, cold, new: newL, later, unassigned, sitevisits, booked, paymentPending,
                    rankings: { telecallers: leadRankings }
                }
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    fastify.get("/leads/recent", async (req, reply) => {
        try {
            const companyId = req.user.companyId;
            const roleName = (req.user.role?.roleName || "").toUpperCase();
            const userType = (req.user.userType || "").toLowerCase();

            const where = { companyId };

            const isTC = userType === "telecaller";
            const isAdminTC = userType === "admin" && roleName === "TELECALLER ADMIN";
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin");

            if (isTC) {
                where.dedicatedTCId = req.user.userId;
                where.NOT = {
                    addedByRole: "ASSOCIATE"
                };
            } else if (!isAdmin) {
                where.associateId = req.user.userId;
            }

            const leads = await prisma.lead.findMany({
                where,
                include: {
                    user: { select: { username: true } },
                    associate: { select: { firstName: true, lastName: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 10
            });

            return reply.send({ success: true, leads });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // =====================================================
    // LIVE ACTIVITY STREAM
    // =====================================================
    fastify.get("/activities", async (req, reply) => {
        try {
            const companyId = req.user.companyId;
            const roleName = (req.user.role?.roleName || "").toUpperCase();
            const userType = (req.user.userType || "").toLowerCase();

            const isTelecaller = roleName === "TELECALLER";
            const isAccountant = roleName === "ACCOUNTANT" || roleName === "ACCOUNTS";
            const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";
            const isAssociate = !isAdmin && !isTelecaller && !isAccountant;

            const isTC = userType === "telecaller";

            const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

            const callLogWhere = { lead: { companyId }, createdAt: { gte: twentyFourHoursAgo } };
            const meetingWhere = { lead: { companyId }, createdAt: { gte: twentyFourHoursAgo } };

            if (isTC) {
                callLogWhere.lead.dedicatedTCId = req.user.userId;
                meetingWhere.lead.dedicatedTCId = req.user.userId;
            } else if (isAssociate) {
                callLogWhere.lead.associateId = req.user.userId;
                meetingWhere.lead.associateId = req.user.userId;
            }

            const [logs, meetings] = await Promise.all([
                prisma.callLog.findMany({
                    where: callLogWhere,
                    include: {
                        dedicatedTC: { select: { firstName: true, lastName: true } },
                        adminTC: { select: { firstName: true, lastName: true } },
                        telecaller: { select: { firstName: true, lastName: true } },
                        lead: { select: { leadName: true } }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 15
                }),
                prisma.meeting.findMany({
                    where: meetingWhere,
                    include: {
                        associate: { select: { firstName: true, lastName: true } },
                        lead: { select: { leadName: true } }
                    },
                    orderBy: { createdAt: "desc" },
                    take: 15
                })
            ]);

            const callActivities = logs.map(l => {
                const tcName = l.dedicatedTC ? l.dedicatedTC.firstName : 
                               l.adminTC ? l.adminTC.firstName : 
                               l.telecaller?.firstName || "System";
                return {
                    id: l.id,
                    text: `<strong>${tcName}</strong> marked ${l.lead.leadName} as <strong>${l.status}</strong>`,
                    createdAt: l.createdAt,
                    color: l.status === 'HOT' ? '#ef4444' : '#3b82f6'
                };
            });

            const meetingActivities = meetings.map(m => {
                const assocName = m.associate?.firstName || "Associate";
                let statusText = m.outcome;
                if (m.outcome === "SITEVISIT") {
                    if (m.interested === "YES" && m.bookingStatus) {
                        statusText = m.bookingStatus === "BOOKED" ? "BOOKED / CONFIRMED" : "PAYMENT PENDING";
                    } else {
                        statusText = "SITE VISIT DONE";
                    }
                } else if (m.outcome === "BOOKED") {
                    statusText = "BOOKED";
                } else if (m.outcome === "FOLLOWUP") {
                    statusText = "FOLLOWUP REQUIRED";
                } else if (m.outcome === "COLD") {
                    statusText = "GONE COLD";
                }
                return {
                    id: m.id,
                    text: `<strong>${assocName}</strong> marked ${m.lead.leadName} as <strong>${statusText}</strong>`,
                    createdAt: m.createdAt,
                    color: m.bookingStatus === 'BOOKED' || m.outcome === 'BOOKED' ? '#10b981' : m.outcome === 'SITEVISIT' ? '#f59e0b' : '#3b82f6'
                };
            });

            const activities = [...callActivities, ...meetingActivities]
                .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                .slice(0, 15);

            return reply.send({ success: true, activities });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // =====================================================
    // BULK UPLOAD LEADS (Telecaller Admin / Client Admin)
    // =====================================================
    fastify.post("/leads/bulk", async (req, reply) => {
        try {
            const data = await req.file();
            if (!data) return reply.code(400).send({ success: false, message: "No file uploaded" });

            const buffer = await data.toBuffer();
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (!rows.length) return reply.code(400).send({ success: false, message: "File is empty" });

            const companyId = req.user.companyId;
            let successCount = 0;

            let assignedById = null;
            if (req.user.userId) {
                const userRecord = await prisma.user.findUnique({ where: { id: req.user.userId } });
                if (userRecord) {
                    assignedById = req.user.userId;
                }
            }

            const bulkUserType = (req.user.userType || "").toLowerCase();
            const bulkRoleName = (req.user.role?.roleName || "").toUpperCase();
            const bulkIsAdmin = bulkUserType === "admin" || bulkUserType === "clientadmin" || bulkUserType === "superadmin";

            const addedByName = req.user.firstName 
                ? `${req.user.firstName} ${req.user.lastName || ""}`.trim()
                : (req.user.username || "System");

            let addedByRole = "SYSTEM";
            if (bulkUserType === "telecaller") {
                addedByRole = "TELECALLER";
            } else if (bulkUserType === "admin" && bulkRoleName === "TELECALLER ADMIN") {
                addedByRole = "TELECALLER ADMIN";
            } else if (bulkIsAdmin) {
                addedByRole = "ADMIN";
            } else {
                addedByRole = "ASSOCIATE";
            }

            // Batch processing (load-balanced auto distribution)
            for (const row of rows) {
                const leadName = row.leadName || row.name || row.Name;
                const leadContact = String(row.leadContact || row.phone || row.Phone || "");

                if (!leadName || !leadContact) continue;

                // Fallback for userId if the creator is an Admin
                let creatorUserId = req.user.userId;
                const userType = (req.user.userType || "").toLowerCase();
                const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";

                if (isAdmin) {
                    const fallbackUser = await prisma.user.findFirst({ where: { companyId } });
                    if (fallbackUser) creatorUserId = fallbackUser.id;
                }

                let dedicatedTCId = null;
                let adminTCId = null;

                const assignedTC = await getTelecallerForLead(companyId);
                if (assignedTC) {
                    if (assignedTC.isDedicatedTC) {
                        dedicatedTCId = assignedTC.id;
                    } else {
                        adminTCId = assignedTC.id;
                    }
                }

                await prisma.lead.create({
                    data: {
                        leadName,
                        leadContact,
                        leadEmail: row.leadEmail || row.email || "",
                        leadSource: row.leadSource || "OTHER",
                        description: row.description || "Bulk Imported",
                        leadCity: row.leadCity || row.city || "",
                        leadStatus: "NEW",
                        companyId,
                        userId: creatorUserId,
                        dedicatedTCId,
                        adminTCId,
                        date: new Date(),
                        assignedById,
                        addedByName,
                        addedByRole
                    }
                });
                successCount++;
            }

            return reply.send({ success: true, count: successCount });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Batch processing failed" });
        }
    });

    // =====================================================
    // LOG MEETING (Associate)
    // =====================================================
    fastify.post("/leads/:id/meeting", async (req, reply) => {
        try {
            const { id } = req.params;
            const { outcome, notes, meetingDate, interested, bookingStatus, followUpDate } = req.body;
            const companyId = req.user.companyId;

            let lead = await prisma.lead.findUnique({ where: { id } });
            if (!lead || lead.companyId !== companyId) {
                return reply.code(404).send({ success: false, message: "Lead not found" });
            }

            const meeting = await prisma.meeting.create({
                data: {
                    leadId: id,
                    associateId: req.user.userId,
                    outcome,
                    notes,
                    meetingDate: meetingDate ? new Date(meetingDate) : null,
                    interested,
                    bookingStatus,
                    followUpDate: followUpDate ? new Date(followUpDate) : null
                }
            });

            // Update lead's assocStatus based on outcome and booking details
            let finalAssocStatus = outcome;
            if (outcome === "SITEVISIT" && interested === "YES" && bookingStatus) {
                finalAssocStatus = bookingStatus;
            }

            await prisma.lead.update({
                where: { id },
                data: { 
                    assocStatus: finalAssocStatus,
                    notes: notes || undefined 
                }
            });

            // Notify all Admins who have CRM module access
            const admins = await prisma.admin.findMany({
                where: {
                    companyId,
                    role: {
                        modules: {
                            has: "CRM"
                        }
                    }
                }
            });
            let outcomeText = outcome;
            if (outcome === "SITEVISIT") {
                if (interested === "YES" && bookingStatus) {
                    outcomeText = bookingStatus === "BOOKED" ? "BOOKED" : "PAYMENT PENDING";
                } else {
                    outcomeText = "SITE VISIT DONE";
                }
            } else if (outcome === "FOLLOWUP") {
                outcomeText = "FOLLOWUP REQUIRED";
            } else if (outcome === "COLD") {
                outcomeText = "GONE COLD";
            }

            for (const admin of admins) {
                await createCrmNotification({
                    title: "Lead Meeting Outcome Updated",
                    body: `Associate ${req.user.firstName || req.user.username} updated lead ${lead.leadName} to ${outcomeText}.`,
                    notificationType: "LEAD_OUTCOME_UPDATE",
                    companyId: lead.companyId,
                    adminId: admin.id
                });
            }

            return reply.send({ success: true, meeting });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Failed to log meeting" });
        }
    });

    fastify.get("/meetings/recent", async (req, reply) => {
        try {
            const companyId = req.user.companyId;
            const roleName = (req.user.role?.roleName || "").toUpperCase();
            const userType = (req.user.userType || "").toLowerCase();

            const where = { lead: { companyId } };

            const isTC = userType === "telecaller";
            const isAdminTC = userType === "admin" && roleName === "TELECALLER ADMIN";
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin");

            if (!isAdmin) {
                // If not admin, only show meetings logged by this associate
                where.associateId = req.user.userId;
            }

            const meetings = await prisma.meeting.findMany({
                where,
                include: {
                    lead: { select: { leadName: true, leadContact: true } },
                    associate: { select: { firstName: true, lastName: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 10
            });

            return reply.send({ success: true, meetings });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // =====================================================
    // GET LEAD INTERACTION HISTORY
    // =====================================================
    fastify.get("/leads/:id/history", async (req, reply) => {
        try {
            const { id } = req.params;
            const companyId = req.user.companyId;

            const lead = await prisma.lead.findUnique({
                where: { id },
                include: {
                    callLogs: {
                        include: { 
                            dedicatedTC: { select: { firstName: true, lastName: true } },
                            adminTC: { select: { firstName: true, lastName: true } },
                            telecaller: { select: { firstName: true, lastName: true } }
                        },
                        orderBy: { createdAt: "desc" }
                    },
                    meetings: {
                        include: { associate: { select: { firstName: true, lastName: true } } },
                        orderBy: { createdAt: "desc" }
                    }
                }
            });

            if (!lead || lead.companyId !== companyId) {
                return reply.code(404).send({ success: false, message: "Lead not found" });
            }

            return reply.send({ 
                success: true, 
                lead: { name: lead.leadName, phone: lead.leadContact },
                calls: lead.callLogs.map(c => ({
                    id: c.id,
                    createdAt: c.createdAt,
                    status: c.status,
                    notes: c.notes,
                    telecaller: { name: (c.dedicatedTC?.firstName || c.adminTC?.firstName || c.telecaller?.firstName || "System") }
                })),
                meetings: lead.meetings.map(m => ({
                    id: m.id,
                    createdAt: m.createdAt,
                    outcome: m.outcome,
                    notes: m.notes,
                    associate: { name: `${m.associate.firstName} ${m.associate.lastName}` }
                }))
            });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "History load error" });
        }
    });

    // =====================================================
    // GET ASSIGNABLES (Telecallers and Associates for dropdowns)
    // =====================================================
    fastify.get("/assignables", async (req, reply) => {
        try {
            const companyId = req.user.companyId;

            // 1. Fetch Admins with Telecaller role
            const adminTcs = await prisma.admin.findMany({
                where: { 
                    companyId,
                    role: { roleName: { contains: "TELECALLER", mode: "insensitive" } }
                },
                select: { id: true, firstName: true, lastName: true }
            });

            // 2. Fetch Dedicated Telecallers from Telecaller table
            const dedicatedTcs = await prisma.telecaller.findMany({
                where: {
                    companyId
                },
                select: { id: true, firstName: true, lastName: true }
            });

            // Combine and deduplicate by ID
            const telecallerMap = new Map();
            adminTcs.forEach(t => {
                telecallerMap.set(t.id, `${t.firstName || ""} ${t.lastName || ""}`.trim());
            });
            dedicatedTcs.forEach(t => {
                if (!telecallerMap.has(t.id)) {
                    telecallerMap.set(t.id, `${t.firstName || ""} ${t.lastName || ""}`.trim());
                }
            });
            const combinedTcs = Array.from(telecallerMap.entries()).map(([id, name]) => ({ id, name }));

            // 3. Fetch Associates (Users)
            const associates = await prisma.user.findMany({
                where: { 
                    companyId
                },
                select: { id: true, firstName: true, lastName: true }
            });

            return reply.send({ 
                success: true, 
                telecallers: combinedTcs,
                associates: associates.map(a => ({ id: a.id, name: `${a.firstName || ""} ${a.lastName || ""}`.trim() }))
            });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Failed to fetch assignables" });
        }
    });

}
