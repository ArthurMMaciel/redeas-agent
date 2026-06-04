import type { FastifyInstance } from "fastify";
import { buildContainer } from "../../composition/container.js";
import { extractWahaMessage } from "../waha-payload.js";

let container: ReturnType<typeof buildContainer> | null = null;

function getContainer() {
  container ??= buildContainer();
  return container;
}

export function registerWebhookRoutes(app: FastifyInstance) {
  app.post("/webhooks/waha", async (request, reply) => {
    const message = extractWahaMessage(request.body);
    if (!message) {
      return reply.code(202).send({ accepted: false, reason: "ignored_or_invalid_message" });
    }

    await getContainer().registerWhatsAppMessage.execute(message);
    return reply.code(202).send({ accepted: true });
  });

  app.post("/webhooks/payments", async (_request, reply) => {
    return reply.code(202).send({ accepted: true });
  });
}
