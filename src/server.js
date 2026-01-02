import "dotenv/config";
import Fastify from "fastify";
import cors from "@fastify/cors";

const app = Fastify();

// CORS
await app.register(cors, {
  origin: true, // allow all origins
  credentials: true,
});

// Health check
app.get("/health", async () => {
  return { status: "ok" };
});

// Register routes later
// app.register(userRoutes, { prefix: '/api/users' })

// Start server
const PORT = process.env.PORT || 3000;

try {
  await app.listen({ port: PORT, host: "0.0.0.0" });
  console.log(`Server running on port ${PORT}`);
} catch (err) {
  console.error(err);
  process.exit(1);
}
