import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { inboundMessageSchema } from "../../../application/schemas/message-schemas.js";
import { MessageProcessingError } from "../../../application/services/message-processor-service.js";
import { buildContainer } from "../../composition/container.js";
import { env } from "../../config/env.js";

let container: ReturnType<typeof buildContainer> | null = null;

function getContainer() {
  container ??= buildContainer();
  return container;
}

export function registerMessageRoutes(app: FastifyInstance) {
  app.post("/api/v1/messages", async (request, reply) => {
    if (!authorizeRequest(request, reply)) {
      return;
    }

    const parsed = inboundMessageSchema.safeParse(request.body);
    if (!parsed.success) {
      request.log.warn(
        { issues: parsed.error.issues },
        "Rejected invalid inbound message"
      );
      return reply.code(400).send({
        success: false,
        error: {
          code: "invalid_payload",
          message: "Payload inválido.",
          issues: parsed.error.flatten()
        }
      });
    }

    request.log.info(
      {
        channel: parsed.data.channel,
        userId: parsed.data.userId,
        conversationId: parsed.data.conversationId,
        messageId: parsed.data.message.id,
        messageType: parsed.data.message.type
      },
      "Processing inbound message"
    );

    try {
      const response = await getContainer().messageProcessor.process(parsed.data);
      request.log.info(
        {
          channel: parsed.data.channel,
          conversationId: parsed.data.conversationId,
          messageId: parsed.data.message.id,
          duplicate: response.response.metadata.duplicate
        },
        "Inbound message processed"
      );
      return reply.code(200).send(response);
    } catch (error) {
      if (error instanceof MessageProcessingError) {
        const statusCode = error.code === "user_not_found" ? 404 : 400;
        return reply.code(statusCode).send({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      throw error;
    }
  });
}

function authorizeRequest(request: FastifyRequest, reply: FastifyReply): boolean {
  if (!env.AGENT_API_KEY) {
    return true;
  }

  const authorization = request.headers.authorization;
  const bearer = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : null;
  const apiKey = firstHeader(request.headers["x-api-key"]);

  if (bearer === env.AGENT_API_KEY || apiKey === env.AGENT_API_KEY) {
    return true;
  }

  reply.code(401).send({
    success: false,
    error: { code: "unauthorized", message: "API key inválida ou ausente." }
  });
  return false;
}

function firstHeader(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
