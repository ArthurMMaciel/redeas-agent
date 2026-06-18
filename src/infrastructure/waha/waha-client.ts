import { env } from "../config/env.js";
import type { WhatsAppGateway } from "../../application/ports/messaging.js";

export class WahaClient implements WhatsAppGateway {
  async sendText(input: { phone: string; text: string }): Promise<void> {
    if (env.WAHA_DRY_RUN) {
      return;
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
      throw new Error(`WAHA sendText failed with status ${response.status}`);
    }
  }

}
