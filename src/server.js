import "dotenv/config"; // Force reload env
import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import prismaPlugin from "./plugins/prisma.js";
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
import clientAdminRoutes from "./routes/clientAdmin.routes.js";
import performanceRoutes from "./routes/performance.routes.js";
import crmRoutes from "./routes/crm.routes.js";
import { financeRoutes } from "./routes/finance.routes.js";
import requestRoutes from "./routes/requests.routes.js";
import { siteVisitRoutes } from "./routes/siteVisit.routes.js";
import noteRoutes from "./routes/note.routes.js";
import reminderRoutes from "./routes/reminder.routes.js";
import { projectStatusRoutes } from "./routes/projectStatus.routes.js";
import { associateFinanceRoutes } from "./routes/associateFinance.routes.js";
import { migrateRoutes } from "./routes/migrate.routes.js";

const app = Fastify({
  logger: true,
});

// CORS
await app.register(cors, {
  origin: "*", // allow all origins
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
});

await app.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  }
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
app.register(clientAdminRoutes, { prefix: "/api/client-admin" });
app.register(performanceRoutes, { prefix: "/api/performance" });
app.register(crmRoutes, { prefix: "/api/crm" });

// Roles route
app.register(rolesRoutes, { prefix: "/api/roles" });

// tree route
app.register(teamTreeRoutes, { prefix: "/api/tree" });

// user route
app.register(userRoutes, { prefix: "/api/user" });

// project route
app.register(projectRoutes, { prefix: "/api" });

// project status route
app.register(projectStatusRoutes, { prefix: "/api" });

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
app.register(financeRoutes, { prefix: "/api/finance" });
app.register(requestRoutes, { prefix: "/api" });
app.register(siteVisitRoutes, { prefix: "/api" });
app.register(noteRoutes, { prefix: "/api" });
app.register(reminderRoutes, { prefix: "/api" });
app.register(migrateRoutes, { prefix: "/api/migrate" });
app.register(associateFinanceRoutes, { prefix: "/api/associate-finance" });


// Start server
const PORT = process.env.PORT || 4000;

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server running on port ${PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
