import authMiddleware from "../middlewares/auth.middleware.js";
import { v4 as uuid } from "uuid";

export default async function superadminRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // Middleware to check if user is a Super Admin
    const isSuperAdmin = async (req, reply) => {
        const userType = req.user.userType?.toLowerCase();
        const roleName = (req.user.role?.roleName || req.user.role || "").toLowerCase();
        
        const isSuper = userType === 'superadmin' || userType === 'super-admin' || 
                        roleName === 'superadmin' || roleName === 'super-admin';

        if (!req.user || !isSuper) {
            fastify.log.warn(`Unauthorized SuperAdmin access attempt from user: ${req.user.userId}`);
            return reply.code(403).send({ success: false, message: "Forbidden: Super Admin access required" });
        }
    };

    // GET /api/superadmin/companies
    fastify.get("/companies", { preHandler: [isSuperAdmin] }, async (req, reply) => {
        try {
            const { page = 1, size = 10, name } = req.query;
            const skip = (Number(page) - 1) * Number(size);
            const take = Number(size);

            const where = {
                status: { not: "DELETED" }
            };
            
            if (name) {
                where.AND = [
                    { status: { not: "DELETED" } },
                    {
                        OR: [
                            { company: { contains: name, mode: 'insensitive' } },
                            { domain: { contains: name, mode: 'insensitive' } },
                            { email: { contains: name, mode: 'insensitive' } }
                        ]
                    }
                ];
            }

            const [items, total] = await Promise.all([
                prisma.company.findMany({
                    where,
                    include: {
                        _count: {
                            select: {
                                admins: true,
                                users: true,
                                projects: true,
                                plots: true
                            }
                        }
                    },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take,
                }),
                prisma.company.count({ where }),
            ]);

            return reply.send({
                success: true,
                total,
                items,
                pageNumber: Number(page),
                pageLimit: Number(size),
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // GET /api/superadmin/companies/dashboard
    fastify.get("/companies/dashboard", { preHandler: [isSuperAdmin] }, async (req, reply) => {
        try {
            const items = await prisma.company.findMany({
                where: {
                    status: { not: "DELETED" }
                },
                include: {
                    _count: {
                        select: {
                            admins: true,
                            users: true,
                            projects: true,
                            plots: true
                        }
                    }
                },
                orderBy: { createdAt: "desc" }
            });

            return reply.send({
                success: true,
                data: {
                    companies: items
                }
            });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // POST /api/superadmin/companies
    fastify.post("/companies", { preHandler: [isSuperAdmin] }, async (req, reply) => {
        try {
            const body = req.body;
            
            const existingCompany = await prisma.company.findUnique({
                where: { email: body.email }
            });

            if (existingCompany) {
                return reply.code(400).send({ success: false, message: "Company with this email already exists" });
            }

            if (body.domain) {
                const existingDomain = await prisma.company.findUnique({
                    where: { domain: body.domain }
                });
    
                if (existingDomain) {
                    return reply.code(400).send({ success: false, message: "Company with this domain already exists" });
                }
            }

            const company = await prisma.company.create({
                data: {
                    id: uuid(),
                    company: body.company,
                    address: body.address,
                    img: body.img,
                    phone: body.phone,
                    email: body.email,
                    domain: body.domain,
                    status: body.status || "ACTIVE",
                    modules: body.modules || [],
                }
            });

            return reply.send({ success: true, message: "Company created successfully", data: company });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // GET /api/superadmin/companies/:id
    fastify.get("/companies/:id", { preHandler: [isSuperAdmin] }, async (req, reply) => {
        try {
            const { id } = req.params;
            const company = await prisma.company.findUnique({
                where: { id }
            });

            if (!company) {
                return reply.code(404).send({ success: false, message: "Company not found" });
            }

            return reply.send({ success: true, items: company, data: company });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // PUT /api/superadmin/companies/:id
    fastify.put("/companies/:id", { preHandler: [isSuperAdmin] }, async (req, reply) => {
        try {
            const { id } = req.params;
            const body = req.body;

            const existingCompany = await prisma.company.findUnique({
                where: { id }
            });

            if (!existingCompany) {
                return reply.code(404).send({ success: false, message: "Company not found" });
            }

            const company = await prisma.company.update({
                where: { id },
                data: {
                    company: body.company,
                    address: body.address,
                    img: body.img || body.image,
                    phone: body.phone,
                    email: body.email,
                    domain: body.domain,
                    status: body.status,
                    modules: body.modules,
                }
            });

            return reply.send({ success: true, message: "Company updated successfully", data: company });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // DELETE /api/superadmin/companies/:id
    fastify.delete("/companies/:id", { preHandler: [isSuperAdmin] }, async (req, reply) => {
        try {
            // Perform soft delete by updating status to DELETED
            await prisma.company.update({
                where: { id },
                data: { status: "DELETED" }
            });

            return reply.send({ success: true, message: "Company deleted successfully" });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error. Company may have related records." });
        }
    });
}
