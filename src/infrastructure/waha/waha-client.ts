import { env } from "../config/env.js";
import type { WhatsAppGateway, WhatsAppSendResult } from "../../application/ports/messaging.js";

export class WahaClient implements WhatsAppGateway {
  async sendText(input: { phone: string; text: string }): Promise<WhatsAppSendResult> {
    if (env.WAHA_DRY_RUN) {
      return { status: 200, body: null };
    }

    const response = await fetch(`${env.WAHA_BASE_URL}/api/sendText`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {})
      },
      body: JSON.stringify({
        session: env.WAHA_SESSION,
        chatId: input.phone,
        text: input.text
      })
    });

    if (!response.ok) {
      throw new Error(`WAHA sendText failed with status ${response.status}: ${await response.text()}`);
    }

    return {
      status: response.status,
      body: await response.text()
    };
  }

  async resolveLidPhone(lid: string): Promise<string | null> {
    const response = await fetch(
      `${env.WAHA_BASE_URL}/api/${encodeURIComponent(env.WAHA_SESSION)}/lids/${encodeURIComponent(lid)}`,
      {
        method: "GET",
        headers: {
          ...(env.WAHA_API_KEY ? { "X-Api-Key": env.WAHA_API_KEY } : {})
        }
      }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      throw new Error(`WAHA lid lookup failed with status ${response.status}: ${await response.text()}`);
    }

    const payload = (await response.json()) as unknown;
    const phone = extractPhoneFromLidLookup(payload);
    return phone ? normalizePhone(phone) : null;
  }
}

function extractPhoneFromLidLookup(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }

  return firstString(payload.pn, payload.phone, payload.phoneNumber, payload.number);
}

function normalizePhone(raw: string): string {
  return raw
    .replace(/@c\.us$/, "")
    .replace(/@s\.whatsapp\.net$/, "")
    .replace(/\D/g, "");
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
