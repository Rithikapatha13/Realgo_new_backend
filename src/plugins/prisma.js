import fp from "fastify-plugin";
import { PrismaClient } from "@prisma/client";
import { sendPushNotification } from "../utils/pushNotifier.js";

export default fp(async (fastify) => {
  const prisma = new PrismaClient();

  prisma.$use(async (params, next) => {
    const result = await next(params);

    if (params.model === "Notification" && params.action === "create" && result) {
      const targetId = result.userId || result.telecallerId || result.adminId;
      if (targetId) {
        sendPushNotification(
          targetId,
          result.title,
          result.body,
          { notificationType: result.notificationType }
        ).catch(err => {
          console.error("[Prisma Middleware] Failed to send push notification:", err);
        });
      }
    }

    return result;
  });

  fastify.decorate("prisma", prisma);

  fastify.addHook("onClose", async (app) => {
    await app.prisma.$disconnect();
  });
});
