import { getS3File, imageOverlay, flyerOverlay, portraitOverlay, imageToPortraitOverlay, badgeOverlay, uploadS3File } from "../utils/imageProcessing.js";

export default async function mediaRoutes(fastify) {
    fastify.get("/load-image", async (request, reply) => {
        try {
            if (!request.user?.userId) {
                return reply.code(401).send({
                    success: false,
                    message: "Unauthorized request",
                    status: 401,
                });
            }

            const companyId = request.user.companyId;
            if (!companyId) {
                return reply.code(404).send({
                    success: false,
                    message: "Company Id Not available",
                    status: 404,
                });
            }

            const company = await fastify.prisma.company.findUnique({
                where: { id: companyId },
            });

            if (!company) {
                return reply.code(404).send({
                    success: false,
                    message: "Company not found",
                    status: 404,
                });
            }

            const { profilePic, giftCard, name, imageCategory, selectedTemplate, text } = request.query;

            const layout = await getS3File(giftCard);
            const avatar = profilePic ? await getS3File(profilePic) : null;
            let results;

            if (imageCategory === "flyer") {
                results = await flyerOverlay(layout, avatar, request.user, name, company, selectedTemplate);
            } else if (imageCategory === "portrait") {
                results = await portraitOverlay(layout, avatar, request.user, company, selectedTemplate);
            } else if (imageCategory === "badge") {
                results = await badgeOverlay(layout, avatar, company);
            } else if (imageCategory === "imageToPortrait") {
                results = await imageToPortraitOverlay(layout, avatar, request.user, text, company);
            } else {
                results = await imageOverlay(layout, avatar, request.user, name, company, selectedTemplate);
            }

            if (!results) {
                throw new Error("Failed to process image overlay");
            }

            const imageUrl = results.location;
            const filename = imageUrl.split("/").pop();

            return reply.code(200).send({
                success: true,
                status: 200,
                message: results,
                filename,
            });
        } catch (e) {
            console.log(e);
            return reply.code(500).send({
                success: false,
                message: "server error",
                status: 500,
            });
        }
    });
}
