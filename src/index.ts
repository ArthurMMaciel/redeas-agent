import { env } from "./infrastructure/config/env.js";
import { buildServer } from "./infrastructure/http/server.js";

const app = buildServer();

await app.listen({ port: env.PORT, host: "0.0.0.0" });

