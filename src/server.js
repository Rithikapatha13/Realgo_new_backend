import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import userAuth from "./routes/auth.routes.js";
import authRoutes from "./routes/auth.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import { teamTreeRoutes } from "./routes/tree.routes.js";


const app = Fastify({
  logger: true
});


// CORS
await app.register(cors, {
  origin: "*", // allow all origins
  // credentials: true,
});

// Prisma Set up
app.register(prismaPlugin);

// Health check
app.get("/health", async () => {
  return { status: "ok" };
});

// Register routes later
app.register(authRoutes, { prefix: "/api/auth" });


// Roles route
app.register(rolesRoutes, { prefix: "/api/roles" });

// tree route
app.register(teamTreeRoutes, { prefix: "/api/tree" });


// Start server
const PORT = process.env.PORT || 4000;

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server running on port ${PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}

