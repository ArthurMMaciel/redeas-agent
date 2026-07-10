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
    const message = extractWahaMessage(request.body, {
      processGroupFromMe: env.WAHA_PROCESS_GROUP_FROM_ME,
      ownPhone: env.WAHA_OWN_PHONE ?? null
    });
    if (!message) {
      request.log.info(
        {
          waha: summarizeWahaPayload(request.body),
          processGroupFromMe: env.WAHA_PROCESS_GROUP_FROM_ME,
          ownPhoneConfigured: Boolean(env.WAHA_OWN_PHONE)
        },
        "Ignored invalid or outbound WAHA message"
      );
      return reply.code(202).send({ accepted: false, reason: "ignored_or_invalid_message" });
    }

    const commandText = extractRedeasCommand(message.text);
    if (!commandText) {
      request.log.info(
        {
          channel: "whatsapp",
          conversationId: message.chatId,
          senderPhone: message.senderPhone,
          isGroup: message.isGroup,
          fromMe: message.fromMe,
          textPreview: preview(message.text),
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
          fromMe: message.fromMe,
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
        fromMe: message.fromMe,
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
        fromMe: message.fromMe,
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

function summarizeWahaPayload(body: unknown): Record<string, unknown> | null {
  if (!isRecord(body)) {
    return null;
  }

  const payload = isRecord(body.payload) ? body.payload : body;
  const key = isRecord(payload.key) ? payload.key : {};

  return {
    event: firstString(body.event, payload.event),
    id: firstString(payload.id, payload.messageId, payload.message_id, body.id),
    chatId: firstString(payload.chatId, payload.chat_id, payload.from, key.remoteJid),
    sender: firstString(payload.sender, payload.participant, payload.author, key.participant),
    fromMe: Boolean(payload.fromMe ?? payload.from_me ?? key.fromMe),
    hasText: Boolean(firstString(payload.body, payload.text, payload.message, payload.caption))
  };
}

function preview(text: string): string {
  return text.length > 80 ? `${text.slice(0, 80)}...` : text;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
