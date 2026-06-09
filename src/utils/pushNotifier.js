import { messaging } from "./firebase.js";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Sends a push notification to all active devices registered for a specific user ID.
 * Automatically cleans up invalid/expired device tokens.
 *
 * @param {string} userId - The target account ID (User, Admin, or Telecaller ID).
 * @param {string} title - The notification title.
 * @param {string} body - The notification body text.
 * @param {object} [data] - Optional metadata payload dictionary.
 */
export async function sendPushNotification(userId, title, body, data = {}) {
  if (!messaging) {
    console.log("[FCM] Push notifications skipped (Admin SDK not initialized).");
    return { success: false, reason: "FCM_NOT_INITIALIZED" };
  }

  try {
    // Find all registered push tokens for this user
    const tokens = await prisma.pushNotification.findMany({
      where: {
        OR: [
          { userId },
          { adminId: userId },
          { telecallerId: userId }
        ]
      },
      select: {
        id: true,
        fcmToken: true
      }
    });

    if (tokens.length === 0) {
      console.log(`[FCM] No registered push tokens found for User: ${userId}`);
      return { success: true, sentCount: 0 };
    }

    const tokenList = tokens.map(t => t.fcmToken);
    
    // Ensure all data values are stringified (Firebase requirements)
    const stringData = {};
    Object.keys(data).forEach(key => {
      stringData[key] = String(data[key]);
    });

    const message = {
      tokens: tokenList,
      notification: {
        title,
        body
      },
      data: stringData,
      android: {
        priority: "high",
        notification: {
          sound: "default"
        }
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1
          }
        }
      }
    };

    console.log(`[FCM] Sending push notification to User: ${userId} (${tokenList.length} device(s))...`);
    const response = await messaging.sendEachForMulticast(message);
    
    console.log(`[FCM] Multicast send complete. Success: ${response.successCount}, Failure: ${response.failureCount}`);

    // Clean up tokens that are no longer registered (expired or uninstalled)
    if (response.failureCount > 0) {
      const tokensToRemove = [];
      response.responses.forEach((res, index) => {
        if (!res.success) {
          const errorCode = res.error?.code;
          if (
            errorCode === "messaging/registration-token-not-registered" ||
            errorCode === "messaging/invalid-registration-token"
          ) {
            tokensToRemove.push(tokens[index].id);
          }
        }
      });

      if (tokensToRemove.length > 0) {
        console.log(`[FCM] Cleaning up ${tokensToRemove.length} inactive device token(s) from database...`);
        await prisma.pushNotification.deleteMany({
          where: {
            id: {
              in: tokensToRemove
            }
          }
        });
      }
    }

    return { 
      success: true, 
      sentCount: response.successCount, 
      failedCount: response.failureCount 
    };

  } catch (error) {
    console.error("[FCM] Error sending push notification:", error);
    return { success: false, error: error.message };
  }
}
