import authMiddleware from "../middlewares/auth.middleware.js";
import XLSX from "xlsx";

// Basic implementation of the CRM (Leads + Dual Pipeline) merged into Realgo Fastify structure

export default async function crmRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

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
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin") && !isAdminTC;

            if (isTC) {
                // Dedicated Telecaller table
                where.dedicatedTCId = req.user.id;
            } else if (isAdminTC) {
                // Admin table telecaller
                where.adminTCId = req.user.id;
            } else if (!isAdmin && !isAccountant) {
                // Associate
                where.associateId = req.user.id;
            }

            // 2. Status Filters
            if (status && status !== "ALL") {
                if (["NEW", "HOT", "WARM", "COLD", "LATER"].includes(status)) {
                    where.leadStatus = status;
                }
                if (["SITEVISIT", "INTERESTED", "FOLLOWUP", "BOOKED"].includes(status)) {
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

            const leads = await prisma.lead.findMany({
                where,
                include: {
                    dedicatedTC: { select: { id: true, firstName: true, lastName: true, image: true } },
                    adminTC: { select: { id: true, firstName: true, lastName: true, image: true } },
                    telecaller: { select: { id: true, firstName: true, lastName: true } }, // Legacy include for names
                    associate: { select: { id: true, firstName: true, lastName: true, image: true } },
                    callLogs: { select: { id: true, callbackAt: true } }
                },
                orderBy: { updatedAt: "desc" }
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
            
            let telecallerId = null;
            let associateId = null;

            const isTelecaller = roleName === "TELECALLER";
            const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";

            if (isTelecaller) {
                telecallerId = req.user.id;
            } else if (!isAdmin) {
                // If Manager, GM, or Associate creates it, they are the owner (Flow A)
                associateId = req.user.id;
            }

            // Fallback for userId if the creator is an Admin (since Lead.userId is mandatory in schema)
            let creatorUserId = req.user.id;
            if (isAdmin) {
                // Find any valid user in this company to satisfied the DB constraint 
                // Alternatively, this field should be made optional in schema.prisma
                const fallbackUser = await prisma.user.findFirst({ where: { companyId } });
                if (fallbackUser) creatorUserId = fallbackUser.id;
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
                    leadStatus: "NEW", // Leadflow mapping to Realgo
                    date: new Date(),
                    companyId,
                    userId: creatorUserId, 
                    dedicatedTCId: userType === "telecaller" ? req.user.id : undefined,
                    adminTCId: userType === "admin" && roleName === "TELECALLER ADMIN" ? req.user.id : undefined,
                    associateId: !isTC && !isAdminTC && !isAdmin ? req.user.id : undefined,
                    assignedById: isAdmin ? null : req.user.id
                }
            });

            return reply.code(201).send({ success: true, lead: newLead });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
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
                        dedicatedTCId: userType === "telecaller" ? req.user.id : null,
                        adminTCId: userType === "admin" ? req.user.id : null,
                        status: status,
                        notes: notes,
                        callbackAt: callbackAt ? new Date(callbackAt) : null
                    }
                });
            }

            // Escalate to Associate Flow B
            /* If Telecaller marked HOT, they generally then escalate. 
               This can be done here or in a targeted /assign handler. */

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

            // Check if telecallerId provided is for Telecaller table or Admin table
            // In a production app, the frontend should ideally specify, but we can check if it exists in Admin
            let assignData = {
                associateId: associateId !== undefined ? associateId : undefined,
                assignedById: isAdmin ? null : req.user.id
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
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin") && !isAdminTC;
            const isAssociate = !isAdmin && !isTC && !isAdminTC && !isAccountant;

            const baseWhere = { companyId };
            
            if (isTC) {
                baseWhere.dedicatedTCId = req.user.id;
            } else if (isAdminTC) {
                baseWhere.adminTCId = req.user.id;
            } else if (isAssociate) {
                baseWhere.associateId = req.user.id;
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
                prisma.lead.count({ where: { ...baseWhere, leadStatus: 'HOT' } }),
                prisma.lead.count({ where: { ...baseWhere, leadStatus: 'WARM' } }),
                prisma.lead.count({ where: { ...baseWhere, leadStatus: 'COLD' } }),
                prisma.lead.count({ where: { ...baseWhere, leadStatus: 'NEW' } }),
                prisma.lead.count({ where: { ...baseWhere, leadStatus: 'LATER' } }),
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
            const isAdmin = (userType === "admin" || userType === "clientadmin" || userType === "superadmin") && !isAdminTC;

            if (isTC) {
                where.dedicatedTCId = req.user.id;
            } else if (isAdminTC) {
                where.adminTCId = req.user.id;
            } else if (!isAdmin) {
                where.associateId = req.user.id;
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
            const isAdminTC = userType === "admin" && roleName === "TELECALLER ADMIN";

            const where = { lead: { companyId } };

            if (isTC) {
                where.lead.dedicatedTCId = req.user.id;
            } else if (isAdminTC) {
                where.lead.adminTCId = req.user.id;
            } else if (isAssociate) {
                where.lead.associateId = req.user.id;
            }

            const logs = await prisma.callLog.findMany({
                where,
                include: {
                    dedicatedTC: { select: { firstName: true, lastName: true } },
                    adminTC: { select: { firstName: true, lastName: true } },
                    telecaller: { select: { firstName: true, lastName: true } },
                    lead: { select: { leadName: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 15
            });

            const activities = logs.map(l => {
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

            // Batch processing (simplified for integration)
            for (const row of rows) {
                const leadName = row.leadName || row.name || row.Name;
                const leadContact = String(row.leadContact || row.phone || row.Phone || "");

                if (!leadName || !leadContact) continue;

                // Fallback for userId if the creator is an Admin
                let creatorUserId = req.user.id;
                const userType = (req.user.userType || "").toLowerCase();
                const isAdmin = userType === "admin" || userType === "clientadmin" || userType === "superadmin";

                if (isAdmin) {
                    const fallbackUser = await prisma.user.findFirst({ where: { companyId } });
                    if (fallbackUser) creatorUserId = fallbackUser.id;
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
                        date: new Date()
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
                        include: { telecaller: { select: { firstName: true, lastName: true } } },
                        orderBy: { createdAt: "desc" }
                    }
                }
            });

            if (!lead || lead.companyId !== companyId) {
                return reply.code(404).send({ success: false, message: "Lead not found" });
            }

            // Realgo architecture doesn't have a separate Meeting table yet, 
            // but we can mock or use a future meetings collection if needed.
            // For now, we return call logs which represent the primary interaction history.

            return reply.send({ 
                success: true, 
                lead: { name: lead.leadName, phone: lead.leadContact },
                calls: lead.callLogs.map(c => ({
                    id: c.id,
                    createdAt: c.createdAt,
                    status: c.status,
                    notes: c.notes,
                    telecaller: { name: `${c.telecaller.firstName} ${c.telecaller.lastName}` }
                })),
                meetings: [] // Placeholder for future expansion
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
            const tcs = await prisma.admin.findMany({
                where: { 
                    companyId,
                    role: { roleName: { contains: "TELECALLER", mode: "insensitive" } },
                    status: "ACTIVE"
                },
                select: { id: true, firstName: true, lastName: true }
            });

            // 2. Fetch Associates (Users)
            const associates = await prisma.user.findMany({
                where: { 
                    companyId,
                    status: "ACTIVE"
                },
                select: { id: true, firstName: true, lastName: true }
            });

            return reply.send({ 
                success: true, 
                telecallers: tcs.map(t => ({ id: t.id, name: `${t.firstName} ${t.lastName}` })),
                associates: associates.map(a => ({ id: a.id, name: `${a.firstName} ${a.lastName}` }))
            });

        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Failed to fetch assignables" });
        }
    });

}
