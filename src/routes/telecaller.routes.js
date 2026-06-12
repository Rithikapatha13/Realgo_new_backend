import authMiddleware from "../middlewares/auth.middleware.js";
import XLSX from "xlsx";
import bcrypt from "bcrypt";
import { v4 as uuid } from "uuid";

export default async function telecallerRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // Helper: Find or create a Telecaller role for a company
    async function getTelecallerRoleId(companyId) {
        let role = await prisma.role.findFirst({
            where: {
                companyId,
                roleName: {
                    equals: "telecaller",
                    mode: "insensitive"
                }
            }
        });

        if (!role) {
            // Create a default Telecaller role
            const company = await prisma.company.findUnique({
                where: { id: companyId }
            });
            const companyName = company ? company.company : "Default Company";

            role = await prisma.role.create({
                data: {
                    id: uuid(),
                    roleName: "TELECALLER",
                    displayName: "Telecaller",
                    status: "ACTIVE",
                    companyId,
                    companyName,
                    modules: ["GENERAL", "CRM"]
                }
            });
        }

        return role.id;
    }

    // POST /api/telecallers - Add a single telecaller
    fastify.post("/telecallers", async (req, reply) => {
        try {
            const { companyId, userId } = req.user;
            const body = req.body;

            if (!body.phone || !body.firstName) {
                return reply.code(400).send({ success: false, message: "First name and Phone are required" });
            }

            // Check uniqueness in Telecaller table
            const exists = await prisma.telecaller.findFirst({
                where: { phone: body.phone, companyId }
            });

            if (exists) {
                return reply.code(409).send({ success: false, message: "Telecaller with this phone number already exists" });
            }

            // Fallback username
            let username = body.username || `${body.firstName}${body.lastName || ""}`.toLowerCase().replace(/\s+/g, "");
            const usernameExists = await prisma.telecaller.findFirst({
                where: { username, companyId }
            });
            if (usernameExists) {
                username = `${username}${Math.floor(Math.random() * 1000)}`;
            }

            const roleId = await getTelecallerRoleId(companyId);
            const hashedPassword = await bcrypt.hash(body.password || "Realgo@123", 10);
            const userAuthId = `TC-${Date.now().toString().slice(-6)}`;

            const telecaller = await prisma.telecaller.create({
                data: {
                    id: uuid(),
                    username,
                    firstName: body.firstName,
                    lastName: body.lastName || null,
                    phone: body.phone,
                    email: body.email || "",
                    password: hashedPassword,
                    roleId,
                    companyId,
                    createdById: userId,
                    userAuthId,
                    status: "VERIFIED", // Telecaller Admins add verified telecallers directly
                    passwordChanged: false
                }
            });

            return reply.send({ success: true, message: "Telecaller added successfully", data: telecaller });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: err.message || "Internal server error" });
        }
    });

    // POST /api/telecallers/bulk - Bulk upload telecallers
    fastify.post("/telecallers/bulk", async (req, reply) => {
        try {
            const fileData = await req.file();
            if (!fileData) {
                return reply.code(400).send({ success: false, message: "No file uploaded" });
            }

            const buffer = await fileData.toBuffer();
            const workbook = XLSX.read(buffer, { type: "buffer" });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(sheet);

            if (!rows.length) {
                return reply.code(400).send({ success: false, message: "File is empty" });
            }

            const { companyId, userId } = req.user;
            const roleId = await getTelecallerRoleId(companyId);

            let successCount = 0;

            for (const row of rows) {
                const firstName = row.firstName || row.FirstName || row.name || row.Name;
                const phone = String(row.phone || row.Phone || row.contact || row.Contact || "").trim();

                if (!firstName || !phone) continue;

                // Check uniqueness in Telecaller table
                const exists = await prisma.telecaller.findFirst({
                    where: { phone, companyId }
                });
                if (exists) continue;

                // Fallback username
                const lastName = row.lastName || row.LastName || "";
                let username = row.username || row.Username || `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, "");
                const usernameExists = await prisma.telecaller.findFirst({
                    where: { username, companyId }
                });
                if (usernameExists) {
                    username = `${username}${Math.floor(Math.random() * 1000)}`;
                }

                const rawPassword = row.password || row.Password || "Realgo@123";
                const hashedPassword = await bcrypt.hash(rawPassword, 10);
                const userAuthId = `TC-${Date.now().toString().slice(-6)}`;

                await prisma.telecaller.create({
                    data: {
                        id: uuid(),
                        username,
                        firstName,
                        lastName: lastName || null,
                        phone,
                        email: row.email || row.Email || null,
                        password: hashedPassword,
                        roleId,
                        companyId,
                        createdById: userId,
                        userAuthId,
                        status: "VERIFIED",
                        passwordChanged: false
                    }
                });

                successCount++;
            }

            return reply.send({ success: true, count: successCount });
        } catch (err) {
            fastify.log.error(err);
            return reply.code(500).send({ success: false, message: "Batch processing failed" });
        }
    });
}
