import "dotenv/config"; // Force reload env
import Fastify from "fastify";
import cors from "@fastify/cors";
import prismaPlugin from "./plugins/prisma.js";
import userAuth from "./routes/auth.routes.js";
import authRoutes from "./routes/auth.routes.js";
import rolesRoutes from "./routes/roles.routes.js";
import { teamTreeRoutes } from "./routes/tree.routes.js";

import commonRoutes from "./routes/common.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import greetingsRoutes from "./routes/greetings.routes.js";
import mediaRoutes from "./routes/media.routes.js";
import userRoutes from "./routes/user.routes.js";
import { projectRoutes } from "./routes/project.routes.js";
import teamRoutes from "./routes/team.routes.js";
import { reportRoutes } from "./routes/report.routes.js";
import { plotRoutes } from "./routes/plot.routes.js";
import newsRoutes from "./routes/news.routes.js";
import videoRoutes from "./routes/video.routes.js";
import showcaseRoutes from "./routes/showcase.routes.js";
import portraitVideoRoutes from "./routes/portraitVideo.routes.js";
import superadminRoutes from "./routes/superadmin.routes.js";

const app = Fastify({
  logger: true,
});

// CORS
await app.register(cors, {
  origin: "*", // allow all origins
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

// Prisma Set up
app.register(prismaPlugin);

// Health check
app.get("/health", async () => {
  return { status: "ok" };
});

// Register routes later
app.register(
  async function (routes) {
    routes.register(authRoutes, { prefix: "/auth" });
    routes.register(commonRoutes, { prefix: "/common" });
    routes.register(adminRoutes);
    routes.register(greetingsRoutes);
    routes.register(mediaRoutes);
  },
  { prefix: "/api" },
);

app.register(superadminRoutes, { prefix: "/api/superadmin" });


// Roles route
app.register(rolesRoutes, { prefix: "/api/roles" });

// tree route
app.register(teamTreeRoutes, { prefix: "/api/tree" });

// user route
app.register(userRoutes, { prefix: "/api/user" });

// project route
app.register(projectRoutes, { prefix: "/api" });

// team route
app.register(teamRoutes, { prefix: "/api" });

// report route
app.register(reportRoutes, { prefix: "/api" });

// plot route
app.register(plotRoutes, { prefix: "/api" });

// media routes
app.register(newsRoutes, { prefix: "/api" });
app.register(videoRoutes, { prefix: "/api" });
app.register(showcaseRoutes, { prefix: "/api" });
app.register(portraitVideoRoutes, { prefix: "/api" });


// Start server
const PORT = process.env.PORT || 4000;

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server running on port ${PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
