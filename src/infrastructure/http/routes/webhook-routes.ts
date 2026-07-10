import type { FastifyInstance } from "fastify";
import { buildContainer } from "../../composition/container.js";
import { env } from "../../config/env.js";
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
      request.log.debug("Ignored invalid or outbound WAHA message");
      return reply.code(202).send({ accepted: false, reason: "ignored_or_invalid_message" });
    }

    const commandText = extractRedeasCommand(message.text);
    if (!commandText) {
      request.log.debug(
        {
          channel: "whatsapp",
          conversationId: message.phone,
          messageId: message.providerMessageId
        },
        "Ignored WAHA message without Redeas prefix"
      );
      return reply.code(202).send({ accepted: false, reason: "missing_redeas_prefix" });
    }

    if (message.isGroup && !isAllowedGroup(message.chatId)) {
      request.log.info(
        {
          channel: "whatsapp",
          groupId: message.chatId,
          senderPhone: message.senderPhone,
          messageId: message.providerMessageId
        },
        "Ignored WAHA group message from unallowed group"
      );
      return reply.code(202).send({ accepted: false, reason: "group_not_allowed" });
    }

    request.log.info(
      {
        channel: "whatsapp",
        conversationId: message.chatId,
        senderPhone: message.senderPhone,
        isGroup: message.isGroup,
        messageId: message.providerMessageId
      },
      "Processing WAHA message"
    );

    const currentContainer = getContainer();
    const result = await currentContainer.messageProcessor.process({
      channel: "whatsapp",
      conversationId: message.chatId,
      message: {
        id: message.providerMessageId,
        timestamp: message.receivedAt.toISOString(),
        type: "text",
        content: commandText
      },
      identity: {
        phone: message.senderPhone
      }
    });

    if (result.response.metadata.duplicate !== true) {
      await currentContainer.whatsApp.sendText({
        phone: message.chatId,
        text: result.response.message
      });
    }

    request.log.info(
      {
        channel: "whatsapp",
        conversationId: message.chatId,
        senderPhone: message.senderPhone,
        isGroup: message.isGroup,
        messageId: message.providerMessageId,
        duplicate: result.response.metadata.duplicate
      },
      "WAHA message processed"
    );

    return reply.code(202).send({ accepted: true });
  });

  app.post("/webhooks/payments", async (request, reply) => {
    const result = await getContainer().processPaymentWebhook.execute(request.body);
    return reply.code(result.accepted ? 202 : 400).send(result);
  });
}

export function extractRedeasCommand(text: string): string | null {
  const match = text.trim().match(/^redeas(?:\s+|[:,.-]\s*)(.+)$/i);
  return match?.[1]?.trim() || null;
}

function isAllowedGroup(groupId: string): boolean {
  const allowedGroups = env.WAHA_ALLOWED_GROUP_IDS?.split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return !allowedGroups?.length || allowedGroups.includes(groupId);
}
