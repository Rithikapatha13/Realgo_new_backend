export async function teamTreeRoutes(fastify) {
    fastify.get("/team-tree", async () => {
        const users = await fastify.prisma.user.findMany({
            include: { role: true },
            orderBy: { createdAt: "asc" }
        });

        const map = {};
        const roots = [];

        users.forEach(u => {
            map[u.id] = {
                id: u.id,
                name: u.username,
                role: u.role?.role_name || "",
                code: u.userAuthId,
                image: u.profileImage || "https://i.pravatar.cc/150",
                children: []
            };
        });

        users.forEach(u => {
            if (u.teamHeadId && map[u.teamHeadId]) {
                map[u.teamHeadId].children.push(map[u.id]);
            } else {
                roots.push(map[u.id]);
            }
        });

        return roots[0];   // CEO / top person
    });
}
  