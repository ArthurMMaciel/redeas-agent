import type { IncomingWhatsAppMessage } from "../../application/ports/messaging.js";

interface ExtractWahaMessageOptions {
  processGroupFromMe?: boolean;
  ownPhone?: string | null;
}

export function extractWahaMessage(
  body: unknown,
  options: ExtractWahaMessageOptions = {}
): IncomingWhatsAppMessage | null {
  if (!isRecord(body)) {
    return null;
  }

  const payload = isRecord(body.payload) ? body.payload : body;
  const providerMessageId =
    firstString(payload.id, payload.messageId, payload.message_id, nestedString(payload.key, "id")) ??
    firstString(body.id, body.messageId, body.message_id);
  const groupIdFromMessageId = extractGroupId(providerMessageId);
  const rawChatId = firstString(
    groupIdFromMessageId,
    payload.chatId,
    payload.chat_id,
    payload.from,
    nestedString(payload.key, "remoteJid")
  );
  const chatId = normalizeWhatsAppId(rawChatId);
  const isGroup = Boolean(rawChatId?.includes("@g.us") || chatId?.endsWith("@g.us"));
  const fromMe = Boolean(payload.fromMe ?? payload.from_me ?? nestedBoolean(payload.key, "fromMe"));
  if (fromMe && (!isGroup || !options.processGroupFromMe)) {
    return null;
  }

  const text = firstString(payload.body, payload.text, payload.message, payload.caption);
  const senderPhone = isGroup
    ? fromMe
      ? normalizePhone(options.ownPhone ?? null)
      : normalizePhone(
          firstString(
            payload.sender,
            payload.participant,
            payload.author,
            nestedString(payload.key, "participant")
          )
        )
    : normalizePhone(rawChatId);
  if (!text || !chatId || !senderPhone || !providerMessageId) {
    return null;
  }

  return {
    providerMessageId,
    phone: senderPhone,
    chatId,
    senderPhone,
    isGroup,
    fromMe,
    text,
    receivedAt: parseTimestamp(payload.timestamp) ?? new Date()
  };
}

function normalizeWhatsAppId(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  return raw.trim().replace(/@s\.whatsapp\.net$/, "@c.us");
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  return raw
    .replace(/@c\.us$/, "")
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/\D/g, "");
}

function extractGroupId(value: string | null): string | null {
  return value?.match(/\d+@g\.us/)?.[0] ?? null;
}

function parseTimestamp(raw: unknown): Date | null {
  if (typeof raw === "number") {
    return new Date(raw < 10_000_000_000 ? raw * 1000 : raw);
  }

  if (typeof raw === "string") {
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
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

function nestedString(value: unknown, key: string): string | null {
  if (!isRecord(value)) {
    return null;
  }

  return firstString(value[key]);
}

function nestedBoolean(value: unknown, key: string): boolean | null {
  if (!isRecord(value) || typeof value[key] !== "boolean") {
    return null;
  }

  return value[key];
}
