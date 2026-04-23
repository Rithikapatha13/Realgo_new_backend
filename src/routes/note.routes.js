import authMiddleware from "../middlewares/auth.middleware.js";

export default async function noteRoutes(fastify) {
    const { prisma } = fastify;

    fastify.addHook("preHandler", authMiddleware);

    // Create Note
    fastify.post("/notes", async (req, reply) => {
        try {
            const { title, description } = req.body;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            if (!title) {
                return reply.code(400).send({ success: false, message: "Title is required" });
            }

            const newNote = await prisma.note.create({
                data: {
                    title,
                    description,
                    userId,
                    companyId,
                }
            });

            return reply.code(201).send({ success: true, message: "Note created successfully", note: newNote });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get Notes (Paginated)
    fastify.get("/notes", async (req, reply) => {
        try {
            const { page = 1, size = 10, search } = req.query;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const pageIndex = parseInt(page);
            const pageSize = parseInt(size);

            const where = {
                companyId,
                userId,
            };

            if (search) {
                where.OR = [
                    { title: { contains: search, mode: "insensitive" } },
                    { description: { contains: search, mode: "insensitive" } },
                ];
            }

            const [notes, total] = await Promise.all([
                prisma.note.findMany({
                    where,
                    orderBy: { createdAt: "desc" },
                    skip: (pageIndex - 1) * pageSize,
                    take: pageSize,
                }),
                prisma.note.count({ where }),
            ]);

            return reply.send({
                success: true,
                items: notes,
                total,
                pageNumber: pageIndex,
                pageLimit: pageSize,
            });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Get Note by ID
    fastify.get("/notes/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const note = await prisma.note.findUnique({
                where: { id }
            });

            if (!note || note.companyId !== companyId || note.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Note not found" });
            }

            return reply.send({ success: true, notes: note });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Update Note
    fastify.put("/notes/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const { title, description } = req.body;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const existingNote = await prisma.note.findUnique({ where: { id } });

            if (!existingNote || existingNote.companyId !== companyId || existingNote.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Note not found" });
            }

            const updatedNote = await prisma.note.update({
                where: { id },
                data: { title, description }
            });

            return reply.send({ success: true, message: "Note updated successfully", note: updatedNote });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });

    // Delete Note
    fastify.delete("/notes/:id", async (req, reply) => {
        try {
            const { id } = req.params;
            const companyId = req.user.companyId;
            const userId = req.user.id;

            const existingNote = await prisma.note.findUnique({ where: { id } });

            if (!existingNote || existingNote.companyId !== companyId || existingNote.userId !== userId) {
                return reply.code(404).send({ success: false, message: "Note not found" });
            }

            await prisma.note.delete({ where: { id } });

            return reply.send({ success: true, message: "Note deleted successfully" });
        } catch (err) {
            req.log.error(err);
            return reply.code(500).send({ success: false, message: "Internal server error" });
        }
    });
}
