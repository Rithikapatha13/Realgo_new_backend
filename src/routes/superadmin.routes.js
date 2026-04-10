import authMiddleware from "../middlewares/auth.middleware.js";
import { v4 as uuid } from "uuid";
import bcrypt from "bcrypt";

const saltRounds = 10;

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

            const companyId = uuid();

            const company = await prisma.company.create({
                data: {
                    id: companyId,
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

            // Automatically Generate Mandatory Role: COMPANY_ADMIN
            const companyAdminRoleId = uuid();
            const role = { 
                id: companyAdminRoleId, 
                roleName: "COMPANY_ADMIN", 
                displayName: "Company Admin", 
                roleNo: 1, 
                modules: body.modules || [], 
                status: "ACTIVE", 
                companyId, 
                companyName: company.company 
            };
            
            await prisma.role.create({
                data: role
            });

            // Automatically Create Primary Company Admin User in ClientAdmin table
            const hashedPassword = await bcrypt.hash("Realgo@123", saltRounds);
            await prisma.clientAdmin.create({
                data: {
                    id: uuid(),
                    username: `admin_${body.phone || '0000'}`,
                    firstName: body.ownerFirstName || "Company",
                    lastName: body.ownerLastName || "Admin",
                    phone: body.phone || '0000000000',
                    email: body.email,
                    password: hashedPassword,
                    status: "VERIFIED",
                    companyId: companyId,
                    passwordChanged: false,
                    
                    // -- New Full Info Fields --
                    fatherOrHusband: body.ownerFatherOrHusband,
                    gender: body.ownerGender,
                    bloodGroup: body.ownerBloodGroup,
                    dob: body.ownerDob ? new Date(body.ownerDob) : null,
                    aadharNo: body.ownerAadharNo,
                    panNo: body.ownerPanNo,
                    bankName: body.ownerBankName,
                    bankAccountNo: body.ownerBankAccountNo,
                    ifsc: body.ownerIfsc,
                    branch: body.ownerBranch,
                }
            });

            return reply.send({ success: true, message: "Company and Company Admin created successfully", data: company });
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
                where: { id },
                include: {
                    clientAdmins: {
                        take: 1, // Get the primary admin
                        orderBy: { createdAt: "asc" }
                    }
                }
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

            // Handle ClientAdmin - If owner details are provided, either update existing or create new
            if (body.ownerFirstName || body.ownerPhone || body.ownerEmail) {
                const existingAdmin = await prisma.clientAdmin.findFirst({
                    where: { companyId: id }
                });

                const adminData = {
                    firstName: body.ownerFirstName || "Company",
                    lastName: body.ownerLastName || "Admin",
                    phone: body.ownerPhone || body.phone,
                    email: body.ownerEmail || body.email,
                    fatherOrHusband: body.ownerFatherOrHusband || null,
                    gender: body.ownerGender || null,
                    bloodGroup: body.ownerBloodGroup || null,
                    dob: (body.ownerDob && body.ownerDob !== "") ? new Date(body.ownerDob) : null,
                    aadharNo: body.ownerAadharNo || null,
                    panNo: body.ownerPanNo || null,
                    bankName: body.ownerBankName || null,
                    bankAccountNo: body.ownerBankAccountNo || null,
                    ifsc: body.ownerIfsc || null,
                    branch: body.ownerBranch || null,
                };

                if (existingAdmin) {
                    await prisma.clientAdmin.update({
                        where: { id: existingAdmin.id },
                        data: adminData
                    });
                } else {
                    const hashedPassword = await bcrypt.hash("Realgo@123", saltRounds);
                    
                    // Also ensure COMPANY_ADMIN role exists for this company
                    let role = await prisma.role.findFirst({
                        where: { companyId: id, roleName: "COMPANY_ADMIN" }
                    });

                    if (!role) {
                        role = await prisma.role.create({
                            data: {
                                id: uuid(),
                                roleName: "COMPANY_ADMIN",
                                displayName: "Company Admin",
                                roleNo: 1,
                                modules: body.modules || [],
                                status: "ACTIVE",
                                companyId: id,
                                companyName: company.company
                            }
                        });
                    }

                    await prisma.clientAdmin.create({
                        data: {
                            id: uuid(),
                            username: `admin_${body.ownerPhone || body.phone || '0000'}`,
                            password: hashedPassword,
                            status: "VERIFIED",
                            companyId: id,
                            passwordChanged: false,
                            ...adminData
                        }
                    });
                }
            }

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
