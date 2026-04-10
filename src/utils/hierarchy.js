
/**
 * Recursively collects all descendant user IDs starting from userId
 * @param {object} prisma - Prisma client instance
 * @param {string} userId - Root user ID to start searching from
 * @param {string} companyId - Company ID to restrict searching within
 * @param {string} status - Optional status filter
 * @returns {Promise<string[]>} - Array of user IDs (descendants)
 */
export async function getAllSubordinateIds(prisma, userId, companyId, status = null) {
    const subs = await prisma.user.findMany({
        where: {
            teamHeadId: userId,
            companyId,
            ...(status ? { status } : {})
        },
        select: { id: true }
    });

    let ids = subs.map(s => s.id);
    for (const sub of subs) {
        const childIds = await getAllSubordinateIds(prisma, sub.id, companyId, status);
        ids = ids.concat(childIds);
    }
    return ids;
}
