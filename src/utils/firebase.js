import admin from "firebase-admin";

let messaging = null;

try {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

  if (projectId && clientEmail && privateKey) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
    messaging = admin.messaging();
    console.log("🚀 [Firebase] Admin SDK initialized successfully.");
  } else {
    console.warn("⚠️ [Firebase] Missing environment variables (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications are disabled.");
  }
} catch (error) {
  console.error("❌ [Firebase] Failed to initialize Admin SDK:", error);
}

export { messaging };
