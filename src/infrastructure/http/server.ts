import Fastify from "fastify";
import { env } from "../config/env.js";
import { registerHealthRoutes } from "./routes/health-routes.js";
import { registerFinanceRoutes } from "./routes/finance-routes.js";
import { registerWebhookRoutes } from "./routes/webhook-routes.js";
import { registerMessageRoutes } from "./routes/message-routes.js";
import { registerOpenApiRoutes } from "./routes/openapi-routes.js";

export function buildServer() {
  const app = Fastify({ logger: { level: env.LOG_LEVEL } });

  registerHealthRoutes(app);
  registerFinanceRoutes(app);
  registerMessageRoutes(app);
  registerWebhookRoutes(app);
  registerOpenApiRoutes(app);

  return app;
}
