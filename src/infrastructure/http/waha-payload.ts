import type { IncomingWhatsAppMessage } from "../../application/ports/messaging.js";

export function extractWahaMessage(body: unknown): IncomingWhatsAppMessage | null {
  if (!isRecord(body)) {
    return null;
  }

  const payload = isRecord(body.payload) ? body.payload : body;
  const fromMe = Boolean(payload.fromMe ?? payload.from_me);
  if (fromMe) {
    return null;
  }

  const text = firstString(payload.body, payload.text, payload.message, payload.caption);
  const phone = normalizePhone(firstString(payload.from, payload.chatId, payload.chat_id, payload.sender));
  const providerMessageId =
    firstString(payload.id, payload.messageId, payload.message_id, nestedString(payload.key, "id")) ??
    firstString(body.id, body.messageId, body.message_id);

  if (!text || !phone || !providerMessageId) {
    return null;
  }

  return {
    providerMessageId,
    phone,
    text,
    receivedAt: parseTimestamp(payload.timestamp) ?? new Date()
  };
}

function normalizePhone(raw: string | null): string | null {
  if (!raw) {
    return null;
  }

  return raw.replace(/@c\.us$/, "").replace(/@s\.whatsapp\.net$/, "");
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
